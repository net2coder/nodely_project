import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface ConnectionStatusProps {
  status: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors',
        status === 'connected' && 'bg-success/10 text-success',
        status === 'connecting' && 'bg-warning/10 text-warning',
        status === 'disconnected' && 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {status === 'connected' && <Wifi className="w-3 h-3" />}
      {status === 'connecting' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'disconnected' && <WifiOff className="w-3 h-3" />}
      <span className="hidden sm:inline">
        {status === 'connected' && 'Live'}
        {status === 'connecting' && 'Syncing'}
        {status === 'disconnected' && 'Offline'}
      </span>
      {status === 'connected' && (
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      )}
    </div>
  );
}
