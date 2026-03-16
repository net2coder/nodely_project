import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, RefreshCw, Plus, Trash2, Download, 
  Shield, LogOut, LayoutDashboard, FileCode, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Firmware {
  id: string;
  version: string;
  url: string;
  changelog: string | null;
  created_at: string;
}

export default function FirmwareManagement() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newVersion, setNewVersion] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newChangelog, setNewChangelog] = useState('');

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
      fetchFirmwares();
    }
  }, [user, isAdmin]);

  const fetchFirmwares = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('firmware')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setFirmwares(data);
    setLoadingData(false);
  };

  const handleAddFirmware = async () => {
    if (!newVersion || !newUrl) {
      toast({
        title: 'Missing fields',
        description: 'Version and URL are required.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('firmware').insert({
      version: newVersion,
      url: newUrl,
      changelog: newChangelog || null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Firmware added',
        description: `Version ${newVersion} has been uploaded.`,
      });
      setDialogOpen(false);
      setNewVersion('');
      setNewUrl('');
      setNewChangelog('');
      fetchFirmwares();
    }

    setSubmitting(false);
  };

  const handleDeleteFirmware = async (id: string, version: string) => {
    const { error } = await supabase.from('firmware').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Firmware deleted',
        description: `Version ${version} has been removed.`,
      });
      setFirmwares((prev) => prev.filter((f) => f.id !== id));
    }
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
                Firmware
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Firmware Management</h1>
          <p className="text-muted-foreground">
            Upload and manage OTA firmware updates for devices
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={fetchFirmwares}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Firmware
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Firmware</DialogTitle>
                <DialogDescription>
                  Upload a new firmware version for OTA updates.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder="e.g., 1.0.1"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Binary URL</Label>
                  <Input
                    id="url"
                    placeholder="https://storage.example.com/firmware.bin"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changelog">Changelog (optional)</Label>
                  <Textarea
                    id="changelog"
                    placeholder="What's new in this version..."
                    value={newChangelog}
                    onChange={(e) => setNewChangelog(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddFirmware} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Firmware'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Firmware Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Changelog</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : firmwares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileCode className="w-8 h-8" />
                      <p>No firmware versions uploaded yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                firmwares.map((firmware, index) => (
                  <TableRow key={firmware.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">v{firmware.version}</span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                            Latest
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={firmware.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{firmware.url}</span>
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                        {firmware.changelog || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(firmware.created_at!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteFirmware(firmware.id, firmware.version)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
