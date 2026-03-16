import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export function NotificationPrompt() {
  const { isSupported, permission, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed
    const hasDismissed = localStorage.getItem('notification-prompt-dismissed');
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      if (isSupported && permission === 'default') {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!isSupported || permission !== 'default' || dismissed || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md',
        'glass-card rounded-xl p-4 shadow-xl border border-primary/20',
        'animate-in slide-in-from-top-4 fade-in duration-300'
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">Enable Notifications</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Get alerts when your device relay states change, even when the app is in the background.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleEnable} className="gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="gap-1.5">
              <BellOff className="w-3.5 h-3.5" />
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
