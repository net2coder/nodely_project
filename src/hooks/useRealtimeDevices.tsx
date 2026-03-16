import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Device {
  id: string;
  device_uuid: string;
  hardware_id: string;
  device_name: string | null;
  owner_id: string | null;
  relay_state: boolean;
  locked: boolean;
  firmware_version: string;
  last_seen: string | null;
  claimed: boolean | null;
  created_at: string | null;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface UseRealtimeDevicesOptions {
  ownerId?: string | null;
  heartbeatInterval?: number;
  debounceMs?: number;
  onRelayChange?: (deviceName: string, newState: boolean) => void;
  enabled?: boolean;
}

export function useRealtimeDevices({
  ownerId,
  heartbeatInterval = 2000,
  debounceMs = 500,
  onRelayChange,
  enabled = true,
}: UseRealtimeDevicesOptions) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('connecting');

  const prevStatesRef = useRef<Map<string, boolean>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, Device>>(new Map());
  const pendingInsertsRef = useRef<Map<string, Device>>(new Map());
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUpdates = useCallback(() => {
    const updates = new Map(pendingUpdatesRef.current);
    const inserts = new Map(pendingInsertsRef.current);
    const deletes = new Set(pendingDeletesRef.current);

    pendingUpdatesRef.current.clear();
    pendingInsertsRef.current.clear();
    pendingDeletesRef.current.clear();
    flushTimerRef.current = null;

    if (updates.size === 0 && inserts.size === 0 && deletes.size === 0) return;

    setDevices((prev) => {
      let next = prev;

      if (deletes.size > 0) {
        next = next.filter((d) => !deletes.has(d.id));
        deletes.forEach((id) => prevStatesRef.current.delete(id));
      }

      if (updates.size > 0) {
        next = next.map((d) => {
          const updated = updates.get(d.id);
          if (!updated) return d;
          const prevRelay = prevStatesRef.current.get(d.id);
          if (prevRelay !== undefined && prevRelay !== updated.relay_state) {
            onRelayChange?.(updated.device_name || 'Device', updated.relay_state);
          }
          prevStatesRef.current.set(updated.id, updated.relay_state);
          return updated;
        });
      }

      if (inserts.size > 0) {
        const newDevices = Array.from(inserts.values());
        newDevices.forEach((d) => prevStatesRef.current.set(d.id, d.relay_state));
        next = [...newDevices, ...next];
      }

      return next;
    });
  }, [onRelayChange]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushUpdates, debounceMs);
  }, [flushUpdates, debounceMs]);

  // Optimistic update: immediately update local state
  const optimisticUpdate = useCallback((deviceId: string, updates: Partial<Device>) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, ...updates } : d))
    );
    // Also update the prev states ref if relay_state changed
    if (updates.relay_state !== undefined) {
      prevStatesRef.current.set(deviceId, updates.relay_state);
    }
  }, []);

  // Rollback optimistic update on failure
  const rollbackUpdate = useCallback((deviceId: string, previousState: Partial<Device>) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, ...previousState } : d))
    );
    if (previousState.relay_state !== undefined) {
      prevStatesRef.current.set(deviceId, previousState.relay_state);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('devices').select('*').order('created_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      const statesMap = new Map<string, boolean>();
      data.forEach((d) => statesMap.set(d.id, d.relay_state ?? false));
      prevStatesRef.current = statesMap;
      setDevices(data as Device[]);
    }
    setLoading(false);
  }, [ownerId]);

  // Realtime subscription with connection status tracking
  useEffect(() => {
    if (!enabled) return;

    fetchDevices();
    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`devices-rt-${ownerId || 'admin'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Device;
            const prev = pendingUpdatesRef.current.get(updated.id);
            if (!prev || JSON.stringify(prev) !== JSON.stringify(updated)) {
              pendingUpdatesRef.current.set(updated.id, updated);
              scheduleFlush();
            }
          } else if (payload.eventType === 'INSERT') {
            const newDev = payload.new as Device;
            if (ownerId && newDev.owner_id !== ownerId) return;
            pendingInsertsRef.current.set(newDev.id, newDev);
            scheduleFlush();
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            pendingDeletesRef.current.add(id);
            scheduleFlush();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [enabled, ownerId, fetchDevices, scheduleFlush]);

  // Heartbeat for online/offline status recalculation
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setHeartbeat((h) => h + 1);
    }, heartbeatInterval);
    return () => clearInterval(interval);
  }, [enabled, heartbeatInterval]);

  const onlineCount = devices.filter(
    (d) => d.last_seen && new Date(d.last_seen).getTime() > Date.now() - 60000
  ).length;

  const updateDevice = useCallback((deviceId: string, updates: Partial<Device>) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, ...updates } : d))
    );
  }, []);

  const removeDevice = useCallback((deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    prevStatesRef.current.delete(deviceId);
  }, []);

  return {
    devices,
    setDevices,
    loading,
    onlineCount,
    heartbeat,
    connectionStatus,
    fetchDevices,
    updateDevice,
    removeDevice,
    optimisticUpdate,
    rollbackUpdate,
  };
}
