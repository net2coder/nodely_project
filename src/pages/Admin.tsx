import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, RefreshCw, Search, Lock, Unlock, Users, 
  HardDrive, Shield, LogOut, LayoutDashboard, 
  MoreVertical, Trash2, FileCode, UserCog, Pencil, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDevices } from '@/hooks/useRealtimeDevices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Device {
  id: string;
  device_uuid: string;
  hardware_id: string;
  device_name: string | null;
  owner_id: string | null;
  claimed: boolean | null;
  relay_state: boolean;
  locked: boolean;
  firmware_version: string;
  last_seen: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export default function Admin() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { devices, setDevices, loading: loadingDevices, fetchDevices: refetchDevices } = useRealtimeDevices({
    enabled: !!user && isAdmin,
    heartbeatInterval: 2000,
    debounceMs: 1000,
  });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [newOwnerId, setNewOwnerId] = useState<string>('');
  
  // User CRUD state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<AppRole>('customer');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);

    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ]);

    if (profilesResult.data) setProfiles(profilesResult.data);
    if (rolesResult.data) setUserRoles(rolesResult.data);

    setLoadingData(false);
  };

  const toggleDeviceLock = async (deviceId: string, locked: boolean) => {
    const { error } = await supabase
      .from('devices')
      .update({ locked })
      .eq('id', deviceId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, locked } : d))
      );
      toast({
        title: locked ? 'Device locked' : 'Device unlocked',
        description: `Device has been ${locked ? 'locked' : 'unlocked'} successfully.`,
      });
    }
  };

  const toggleDeviceRelay = async (deviceId: string, state: boolean) => {
    const { error } = await supabase
      .from('devices')
      .update({ relay_state: state })
      .eq('id', deviceId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, relay_state: state } : d))
      );
    }
  };

  const openTransferDialog = (device: Device) => {
    setSelectedDevice(device);
    setNewOwnerId(device.owner_id || '');
    setTransferDialogOpen(true);
  };

  const handleTransferOwnership = async () => {
    if (!selectedDevice) return;

    const shouldUnclaim = !newOwnerId || newOwnerId === 'unclaimed';
    const updateData = shouldUnclaim 
      ? { owner_id: null, claimed: false }
      : { owner_id: newOwnerId, claimed: true };

    const { error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', selectedDevice.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setDevices((prev) =>
        prev.map((d) => (d.id === selectedDevice.id ? { ...d, ...updateData } : d))
      );
      toast({
        title: 'Ownership transferred',
        description: newOwnerId 
          ? 'Device has been reassigned to the new owner.'
          : 'Device has been unclaimed.',
      });
      setTransferDialogOpen(false);
      setSelectedDevice(null);
      setNewOwnerId('');
    }
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.hardware_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.device_uuid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.device_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getUserRole = (userId: string): AppRole => {
    const role = userRoles.find((r) => r.user_id === userId);
    return role?.role || 'customer';
  };

  const openEditUserDialog = (profile: Profile) => {
    setSelectedUser(profile);
    setEditUserName(profile.full_name || '');
    setEditUserRole(getUserRole(profile.user_id));
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);

    // Update profile name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: editUserName.trim() || null })
      .eq('user_id', selectedUser.user_id);

    if (profileError) {
      toast({
        title: 'Error updating user',
        description: profileError.message,
        variant: 'destructive',
      });
      setIsUpdatingUser(false);
      return;
    }

    // Update role
    const existingRole = userRoles.find((r) => r.user_id === selectedUser.user_id);
    if (existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editUserRole })
        .eq('user_id', selectedUser.user_id);

      if (roleError) {
        toast({
          title: 'Error updating role',
          description: roleError.message,
          variant: 'destructive',
        });
        setIsUpdatingUser(false);
        return;
      }

      setUserRoles((prev) =>
        prev.map((r) =>
          r.user_id === selectedUser.user_id ? { ...r, role: editUserRole } : r
        )
      );
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.user_id === selectedUser.user_id
          ? { ...p, full_name: editUserName.trim() || null }
          : p
      )
    );

    toast({
      title: 'User updated',
      description: 'User details have been updated successfully.',
    });

    setIsUpdatingUser(false);
    setEditUserDialogOpen(false);
    setSelectedUser(null);
  };

  const openDeleteUserDialog = (profile: Profile) => {
    setSelectedUser(profile);
    setDeleteUserDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);

    // Unclaim all devices owned by this user
    const { error: devicesError } = await supabase
      .from('devices')
      .update({ owner_id: null, claimed: false, device_name: null })
      .eq('owner_id', selectedUser.user_id);

    if (devicesError) {
      console.error('Error unclaiming devices:', devicesError);
    }

    // Delete user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', selectedUser.user_id);

    if (roleError) {
      console.error('Error deleting role:', roleError);
    }

    // Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', selectedUser.user_id);

    if (profileError) {
      toast({
        title: 'Error deleting user',
        description: profileError.message,
        variant: 'destructive',
      });
      setIsDeletingUser(false);
      return;
    }

    // Update local state
    setProfiles((prev) => prev.filter((p) => p.user_id !== selectedUser.user_id));
    setUserRoles((prev) => prev.filter((r) => r.user_id !== selectedUser.user_id));
    setDevices((prev) =>
      prev.map((d) =>
        d.owner_id === selectedUser.user_id
          ? { ...d, owner_id: null, claimed: false, device_name: null }
          : d
      )
    );

    toast({
      title: 'User deleted',
      description: 'User profile and associated data have been removed.',
    });

    setIsDeletingUser(false);
    setDeleteUserDialogOpen(false);
    setSelectedUser(null);
  };

  const stats = {
    totalDevices: devices.length,
    claimedDevices: devices.filter((d) => d.claimed).length,
    lockedDevices: devices.filter((d) => d.locked).length,
    totalUsers: profiles.length,
  };

  if (loading || (!loading && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <Cpu className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">NODELY</span>
              </Link>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Admin
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/firmware" className="gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="hidden sm:inline">Firmware</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard" className="gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage all devices, users, and system settings
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Devices', value: stats.totalDevices, icon: HardDrive },
            { label: 'Claimed', value: stats.claimedDevices, icon: Shield },
            { label: 'Locked', value: stats.lockedDevices, icon: Lock },
            { label: 'Users', value: stats.totalUsers, icon: Users },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="glass-card">
            <TabsTrigger value="devices" className="gap-2">
              <HardDrive className="w-4 h-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Devices Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Relay</TableHead>
                    <TableHead>Locked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No devices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map((device) => {
                      const isOnline =
                        device.last_seen &&
                        new Date(device.last_seen).getTime() > Date.now() - 60000;
                      const owner = profiles.find((p) => p.user_id === device.owner_id);

                      return (
                        <TableRow key={device.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {device.device_name || device.hardware_id}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {device.device_uuid.slice(0, 8)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  isOnline ? 'bg-success' : 'bg-muted-foreground'
                                )}
                              />
                              <span className="text-sm">
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {device.claimed ? (
                              <span className="text-sm">
                                {owner?.email || owner?.full_name || 'Unknown'}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Unclaimed
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={device.relay_state}
                              onCheckedChange={(checked) =>
                                toggleDeviceRelay(device.id, checked)
                              }
                              disabled={device.locked}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={device.locked}
                              onCheckedChange={(checked) =>
                                toggleDeviceLock(device.id, checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleDeviceLock(device.id, !device.locked)
                                  }
                                >
                                  {device.locked ? (
                                    <>
                                      <Unlock className="w-4 h-4 mr-2" />
                                      Unlock
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-4 h-4 mr-2" />
                                      Lock
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openTransferDialog(device)}>
                                  <UserCog className="w-4 h-4 mr-2" />
                                  Transfer Ownership
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const userDevices = devices.filter(
                        (d) => d.owner_id === profile.user_id
                      ).length;
                      const role = getUserRole(profile.user_id);
                      const isCurrentUser = profile.user_id === user?.id;

                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="font-medium">
                              {profile.full_name || 'Unnamed User'}
                            </div>
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={role === 'admin' ? 'default' : 'secondary'}
                              className={cn(
                                role === 'admin' && 'bg-primary text-primary-foreground'
                              )}
                            >
                              {role === 'admin' ? (
                                <ShieldCheck className="w-3 h-3 mr-1" />
                              ) : null}
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(profile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{userDevices}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditUserDialog(profile)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteUserDialog(profile)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={isCurrentUser}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Transfer Ownership Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Device Ownership</DialogTitle>
              <DialogDescription>
                Reassign {selectedDevice?.device_name || selectedDevice?.hardware_id} to a different user or unclaim it.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new owner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclaimed">
                    <span className="text-muted-foreground">Unclaim device</span>
                  </SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.email || 'Unknown user'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTransferOwnership}>
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Edit User Dialog */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and role for {selectedUser?.email || 'this user'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  placeholder="Enter full name"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Role</Label>
                <Select value={editUserRole} onValueChange={(v) => setEditUserRole(v as AppRole)}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                {isUpdatingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedUser?.email || 'this user'}'s profile, 
                remove their role, and unclaim all their devices. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
