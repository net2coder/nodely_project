import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, ArrowLeft, Check, X, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ClaimDevice() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isManualMode = uuid === 'manual';
  const [manualUuid, setManualUuid] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(!isManualMode);
  const [claiming, setClaiming] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    hardware_id: string;
    claimed: boolean;
    device_uuid: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveUuid = isManualMode ? manualUuid : uuid;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/claim/${uuid}`);
    }
  }, [user, authLoading, navigate, uuid]);

  useEffect(() => {
    if (!isManualMode && uuid && user) {
      checkDevice(uuid);
    }
  }, [uuid, user, isManualMode]);

  const checkDevice = async (deviceUuid: string) => {
    setLoading(true);
    setError(null);
    setDeviceInfo(null);

    const { data, error: fetchError } = await supabase
      .from('devices')
      .select('hardware_id, claimed, device_uuid, owner_id')
      .eq('device_uuid', deviceUuid)
      .maybeSingle();

    if (fetchError) {
      setError('Error checking device status.');
    } else if (!data) {
      setError('Device not found. Please check the UUID.');
    } else if (data.claimed) {
      if (data.owner_id === user?.id) {
        setError('You already own this device.');
      } else {
        setError('This device has already been claimed by another user.');
      }
    } else {
      setDeviceInfo(data);
    }

    setLoading(false);
  };

  const handleManualCheck = () => {
    if (!manualUuid.trim()) {
      toast({
        title: 'UUID required',
        description: 'Please enter a device UUID to continue.',
        variant: 'destructive',
      });
      return;
    }
    checkDevice(manualUuid.trim());
  };

  const handleClaim = async () => {
    if (!effectiveUuid || !user) return;

    setClaiming(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error: claimError } = await supabase.functions.invoke('claim-device', {
        body: { device_uuid: effectiveUuid, device_name: deviceName || null },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (claimError) {
        throw new Error(claimError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Device claimed successfully!',
        description: 'Your device is now linked to your account.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Failed to claim device',
        description: err.message || 'An error occurred while claiming the device.',
        variant: 'destructive',
      });
    }

    setClaiming(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Cpu className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">NODELY</span>
            </div>
            <h1 className="text-xl font-semibold">Claim Your Device</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isManualMode ? 'Enter the device UUID to claim it' : 'Link this device to your account'}
            </p>
          </div>

          {/* Manual UUID Entry */}
          {isManualMode && !deviceInfo && !loading && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="uuid">Device UUID</Label>
                <Input
                  id="uuid"
                  placeholder="Enter device UUID from serial output"
                  value={manualUuid}
                  onChange={(e) => setManualUuid(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your device's serial output after setup
                </p>
              </div>

              {error && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                    <X className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleManualCheck}
                variant="hero"
                className="w-full"
                size="lg"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Find Device
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Checking device status...</p>
            </div>
          )}

          {/* Error State (for URL-based claiming) */}
          {!isManualMode && !loading && error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}

          {/* Device Found - Ready to Claim */}
          {deviceInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Hardware ID</div>
                <div className="font-mono text-sm">{deviceInfo.hardware_id}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name (optional)</Label>
                <Input
                  id="deviceName"
                  placeholder="e.g., Living Room Light"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give your device a friendly name for easy identification
                </p>
              </div>

              <Button
                onClick={handleClaim}
                variant="hero"
                className="w-full"
                size="lg"
                disabled={claiming}
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Claim Device
                  </>
                )}
              </Button>

              {isManualMode && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setDeviceInfo(null);
                    setManualUuid('');
                    setError(null);
                  }}
                >
                  Try Different UUID
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
