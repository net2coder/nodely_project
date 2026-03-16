import { useState } from 'react';
import { motion } from 'framer-motion';
import { Power, Lock, Unlock, RefreshCw, MoreVertical, Wifi, WifiOff, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  device_uuid: string;
  hardware_id: string;
  device_name: string | null;
  relay_state: boolean;
  locked: boolean;
  firmware_version: string;
  last_seen: string | null;
}

interface DeviceCardProps {
  device: Device;
  onToggleRelay: (deviceId: string, state: boolean) => void;
  onToggleLock?: (deviceId: string, locked: boolean) => void;
  onRename?: (deviceId: string, newName: string) => void;
  onDelete?: (deviceId: string) => void;
  isAdmin?: boolean;
  isUpdating?: boolean;
}

export function DeviceCard({ 
  device, 
  onToggleRelay, 
  onToggleLock,
  onRename,
  onDelete,
  isAdmin = false,
  isUpdating = false 
}: DeviceCardProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(device.device_name || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOnline = device.last_seen 
    ? new Date(device.last_seen).getTime() > Date.now() - 60000
    : false;

  const getLastSeenText = () => {
    if (!device.last_seen) return 'Never connected';
    const diff = Date.now() - new Date(device.last_seen).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleRename = async () => {
    if (!onRename) return;
    setIsRenaming(true);
    await onRename(device.id, newName.trim());
    setIsRenaming(false);
    setRenameDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(device.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "glass-card rounded-xl p-6 transition-all duration-300",
          device.locked && "opacity-75 border-destructive/30"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isOnline ? "status-online" : "status-offline"
            )} />
            <div>
              <h3 className="font-semibold">
                {device.device_name || device.hardware_id}
              </h3>
              <p className="text-xs font-mono text-muted-foreground">
                {device.device_uuid.slice(0, 8)}...
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setNewName(device.device_name || '');
                setRenameDialogOpen(true);
              }}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {isAdmin && onToggleLock && (
                <DropdownMenuItem onClick={() => onToggleLock(device.id, !device.locked)}>
                  {device.locked ? (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Device
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Device
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Device
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              Status
            </div>
            <div className={cn(
              "text-sm font-medium",
              isOnline ? "text-success" : "text-muted-foreground"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Last Seen</div>
            <div className="text-sm font-medium">{getLastSeenText()}</div>
          </div>
        </div>

        {/* Locked Banner */}
        {device.locked && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
            <Lock className="w-3 h-3" />
            Device locked by administrator
          </div>
        )}

        {/* Relay Control */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Power className={cn(
              "w-5 h-5 transition-colors",
              device.relay_state ? "text-success" : "text-muted-foreground"
            )} />
            <div>
              <div className="font-medium text-sm">Relay</div>
              <div className={cn(
                "text-xs",
                device.relay_state ? "text-success" : "text-muted-foreground"
              )}>
                {device.relay_state ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
          
          <Switch
            checked={device.relay_state}
            onCheckedChange={(checked) => onToggleRelay(device.id, checked)}
            disabled={device.locked || isUpdating}
            className="data-[state=checked]:bg-success"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">
            v{device.firmware_version}
          </span>
          {isUpdating && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      </motion.div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>
              Give your device a friendly name for easy identification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Living Room Light"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink the device from your account. The device can be claimed again by any user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
