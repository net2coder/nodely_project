import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Plus, RefreshCw, Search, LogOut, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { ConnectionStatus } from '@/components/devices/ConnectionStatus';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtimeDevices } from '@/hooks/useRealtimeDevices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { notifyRelayChange } = useNotifications();

  const onRelayChange = useCallback(
    (deviceName: string, newState: boolean) => {
      notifyRelayChange(deviceName, newState);
    },
    [notifyRelayChange]
  );

  const {
    devices,
    loading: loadingDevices,
    onlineCount,
    connectionStatus,
    fetchDevices,
    updateDevice,
    removeDevice,
    optimisticUpdate,
    rollbackUpdate,
  } = useRealtimeDevices({
    enabled: !!user,
    heartbeatInterval: 2000,
    debounceMs: 500,
    onRelayChange,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [updatingDevices, setUpdatingDevices] = useState<Set<string>>(new Set());

  // Debounce rapid toggles per device
  const toggleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const state = location.state as { welcomeBack?: boolean } | null;
    if (state?.welcomeBack && user) {
      toast({
        title: 'Welcome back! 👋',
        description: user.user_metadata?.full_name 
          ? `Good to see you again, ${user.user_metadata.full_name}`
          : 'Good to see you again',
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, user, toast]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      toggleTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const handleToggleRelay = useCallback(async (deviceId: string, state: boolean) => {
    // Cancel any pending debounced toggle for this device
    const existingTimer = toggleTimersRef.current.get(deviceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      toggleTimersRef.current.delete(deviceId);
    }

    // Find previous state for rollback
    const device = devices.find((d) => d.id === deviceId);
    const previousState = device?.relay_state ?? !state;

    // Optimistic update: reflect change immediately
    optimisticUpdate(deviceId, { relay_state: state });

    // Debounce: batch rapid toggles within 1s
    const timer = setTimeout(async () => {
      toggleTimersRef.current.delete(deviceId);
      setUpdatingDevices((prev) => new Set(prev).add(deviceId));

      const { error } = await supabase
        .from('devices')
        .update({ relay_state: state })
        .eq('id', deviceId);

      if (error) {
        // Rollback on failure
        rollbackUpdate(deviceId, { relay_state: previousState });
        toast({
          title: 'Error updating device',
          description: error.message,
          variant: 'destructive',
        });
      }

      setUpdatingDevices((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }, 300); // Short debounce for batching rapid clicks

    toggleTimersRef.current.set(deviceId, timer);
  }, [devices, optimisticUpdate, rollbackUpdate, toast]);

  const handleRenameDevice = async (deviceId: string, newName: string) => {
    const { error } = await supabase
      .from('devices')
      .update({ device_name: newName || null })
      .eq('id', deviceId);

    if (error) {
      toast({
        title: 'Error renaming device',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Device renamed',
        description: 'The device name has been updated.',
      });
      updateDevice(deviceId, { device_name: newName || null });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    const { error } = await supabase
      .from('devices')
      .update({ owner_id: null, claimed: false, device_name: null })
      .eq('id', deviceId);

    if (error) {
      toast({
        title: 'Error removing device',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Device removed',
        description: 'The device has been unlinked from your account.',
      });
      removeDevice(deviceId);
    }
  };

  const filteredDevices = devices.filter((device) =>
    device.device_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.hardware_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.device_uuid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NotificationPrompt />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Cpu className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">NODELY</span>
              </Link>
              <ConnectionStatus status={connectionStatus} />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin" className="gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor your connected devices
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Devices', value: devices.length },
            { label: 'Online', value: onlineCount, highlight: true },
            { label: 'Offline', value: devices.length - onlineCount },
            { label: 'Active Relays', value: devices.filter((d) => d.relay_state).length },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.highlight ? 'text-success' : ''}`}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchDevices}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="hero" asChild>
              <Link to="/claim/manual" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Device</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Devices Grid */}
        {loadingDevices ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredDevices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No devices found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {searchQuery
                ? 'No devices match your search'
                : 'Claim your first device to get started'}
            </p>
            {!searchQuery && (
              <Button variant="hero" asChild>
                <Link to="/claim/manual" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Claim Device
                </Link>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DeviceCard
                  device={device}
                  onToggleRelay={handleToggleRelay}
                  onRename={handleRenameDevice}
                  onDelete={handleDeleteDevice}
                  isUpdating={updatingDevices.has(device.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
