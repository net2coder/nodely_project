import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Settings, Shield, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

export function BottomNav() {
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile) return null;

  const navItems: NavItem[] = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', requiresAuth: true },
    { href: '/claim/manual', icon: Plus, label: 'Add', requiresAuth: true },
    { href: '/admin', icon: Shield, label: 'Admin', requiresAuth: true, adminOnly: true },
    { href: '/settings', icon: Settings, label: 'Settings', requiresAuth: true },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.requiresAuth && !user) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
