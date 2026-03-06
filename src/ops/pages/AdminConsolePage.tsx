import React, { useState } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsProfiles } from '../hooks/useTasks';
import {
  useAuditLog, useConfigRegistry, useUpdateConfig,
  useUpdateProfile, useBranches, useUpdateBranch,
} from '../hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Settings, Users, MapPin, FileText, ScrollText,
  Loader2, Edit, Save, Shield, ShieldCheck, ChevronDown, ChevronUp, UserPlus, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AdminConsolePage() {
  const { isAdmin } = useOpsAuth();
  const { t } = useOpsLanguage();

  if (!isAdmin) return <Navigate to="/ops/home" replace />;

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold flex items-center gap-1.5">
        <Settings className="h-4 w-4 text-primary" />
        {t('nav.adminConsole')}
      </h1>
      <Tabs defaultValue="users">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="users" className="text-[10px] sm:text-xs gap-1"><Users className="h-3 w-3 hidden sm:block" />Users</TabsTrigger>
          <TabsTrigger value="branch" className="text-[10px] sm:text-xs gap-1"><MapPin className="h-3 w-3 hidden sm:block" />Branch</TabsTrigger>
          <TabsTrigger value="config" className="text-[10px] sm:text-xs gap-1"><FileText className="h-3 w-3 hidden sm:block" />Config</TabsTrigger>
          <TabsTrigger value="audit" className="text-[10px] sm:text-xs gap-1"><ScrollText className="h-3 w-3 hidden sm:block" />Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="branch"><BranchSettings /></TabsContent>
        <TabsContent value="config"><ConfigEditor /></TabsContent>
        <TabsContent value="audit"><AuditLogViewer /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── User Management ─── */
function UserManagement() {
  const { data: profiles, isLoading, refetch } = useOpsProfiles();
  const updateProfile = useUpdateProfile();

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-2 mt-3">
      <CreateStaffDialog onCreated={refetch} />
      {(profiles || []).map(p => (
        <UserCard key={p.id} profile={p} onUpdate={updateProfile} />
      ))}
      {(!profiles || profiles.length === 0) && (
        <Card><CardContent className="py-6 text-center text-xs text-foreground/50">No user profiles</CardContent></Card>
      )}
    </div>
  );
}

function CreateStaffDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('manager');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!userId.trim() || !password.trim() || !displayName.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ops-create-staff', {
        body: { userId: userId.trim(), password, displayName: displayName.trim(), role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Staff account created: ${data.email}`);
      setOpen(false);
      setUserId('');
      setPassword('');
      setDisplayName('');
      setRole('manager');
      onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Add Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Staff Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">User ID</label>
            <Input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="e.g. john_ops"
              className="text-sm"
            />
            <p className="text-[10px] text-foreground/40 mt-0.5">Will become john_ops@ops.wavealokam.com</p>
          </div>
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">Display Name</label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. John"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">Initial Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-1.5" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserCard({ profile: p, onUpdate }: { profile: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.display_name);
  const [role, setRole] = useState(p.role);
  const [active, setActive] = useState(p.is_active);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [resetting, setResetting] = useState(false);

  const save = async () => {
    try {
      await onUpdate.mutateAsync({
        id: p.id,
        updates: { display_name: name, role, is_active: active },
      });
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleResetPassword = async () => {
    if (!newPwd || newPwd.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ops-reset-password', {
        body: { targetUserId: p.user_id, newPassword: newPwd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Password reset for ${p.display_name}`);
      setResetOpen(false);
      setNewPwd('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardContent className="py-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {p.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-foreground/40" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{p.display_name}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] capitalize">{p.role}</Badge>
                {!p.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                <span className="text-[10px] text-foreground/40">{p.preferred_language.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setResetOpen(!resetOpen)} title="Reset password">
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(!editing)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {resetOpen && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <p className="text-xs text-foreground/60">Set new password for <strong>{p.display_name}</strong></p>
            <Input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Reset Password
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setResetOpen(false); setNewPwd(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Display name"
              className="text-sm"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/60">Active</span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <Button size="sm" className="w-full gap-1" onClick={save} disabled={onUpdate.isPending}>
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Branch Settings ─── */
function BranchSettings() {
  const { data: branches, isLoading } = useBranches();
  const updateBranch = useUpdateBranch();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-2 mt-3">
      {(branches || []).map(b => (
        <Card key={b.id}>
          <CardContent className="py-3 px-3">
            {editId === b.id ? (
              <div className="space-y-2">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Branch name" className="text-sm" />
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={async () => {
                    try {
                      await updateBranch.mutateAsync({ id: b.id, updates: { name, location } });
                      toast.success('Branch updated');
                      setEditId(null);
                    } catch { toast.error('Failed'); }
                  }} disabled={updateBranch.isPending}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {b.name}
                  </p>
                  <p className="text-xs text-foreground/50">{b.location || 'No location set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={b.is_active ? 'secondary' : 'destructive'} className="text-[10px]">
                    {b.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
                    setEditId(b.id);
                    setName(b.name);
                    setLocation(b.location || '');
                  }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Config Registry ─── */
function ConfigEditor() {
  const { profile } = useOpsAuth();
  const { data: configs, isLoading } = useConfigRegistry();
  const updateConfig = useUpdateConfig();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-2 mt-3">
      {(configs || []).map(c => (
        <Card key={c.key}>
          <CardContent className="py-2.5 px-3">
            {editKey === c.key ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground/70 font-mono">{c.key}</p>
                <Textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={4}
                  className="text-xs font-mono"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={async () => {
                    try {
                      const parsed = JSON.parse(editValue);
                      await updateConfig.mutateAsync({ key: c.key, value: parsed, branchId: profile!.branchId });
                      toast.success('Config saved');
                      setEditKey(null);
                    } catch (e: any) {
                      toast.error(e.message?.includes('JSON') ? 'Invalid JSON' : 'Failed to save');
                    }
                  }} disabled={updateConfig.isPending}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground/70 font-mono">{c.key}</p>
                  <p className="text-[10px] text-foreground/50 font-mono truncate">
                    {JSON.stringify(c.value_json).slice(0, 80)}
                    {JSON.stringify(c.value_json).length > 80 && '…'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => {
                  setEditKey(c.key);
                  setEditValue(JSON.stringify(c.value_json, null, 2));
                }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {(!configs || configs.length === 0) && (
        <Card><CardContent className="py-6 text-center text-xs text-foreground/50">No config entries</CardContent></Card>
      )}
    </div>
  );
}

/* ─── Audit Log Viewer ─── */
function AuditLogViewer() {
  const { data: profiles } = useOpsProfiles();
  const { data: logs, isLoading } = useAuditLog(100);
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-1.5 mt-3">
      {(logs || []).map(log => (
        <AuditLogRow key={log.id} log={log} actorName={profileMap.get(log.performed_by) || 'Unknown'} />
      ))}
      {(!logs || logs.length === 0) && (
        <Card><CardContent className="py-6 text-center text-xs text-foreground/50">No audit log entries</CardContent></Card>
      )}
    </div>
  );
}

function AuditLogRow({ log, actorName }: { log: any; actorName: string }) {
  const [expanded, setExpanded] = useState(false);

  const actionColor: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700',
    update: 'bg-sky-100 text-sky-700',
    delete: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => setExpanded(!expanded)} className="shrink-0">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <Badge className={`text-[10px] ${actionColor[log.action] || 'bg-muted text-foreground/60'}`} variant="secondary">
              {log.action}
            </Badge>
            <span className="text-xs text-foreground/70 truncate">{log.entity_type}</span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-foreground/50">{actorName}</p>
            <p className="text-[10px] text-foreground/40">{format(new Date(log.performed_at), 'MMM d, HH:mm')}</p>
          </div>
        </div>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-border space-y-1.5 text-[10px]">
            <p className="text-foreground/50">Entity ID: <span className="font-mono">{log.entity_id}</span></p>
            {log.before_json && (
              <div>
                <p className="font-semibold text-foreground/60">Before:</p>
                <pre className="bg-muted rounded p-1.5 overflow-x-auto text-foreground/60 font-mono whitespace-pre-wrap">
                  {JSON.stringify(log.before_json, null, 2)}
                </pre>
              </div>
            )}
            {log.after_json && (
              <div>
                <p className="font-semibold text-foreground/60">After:</p>
                <pre className="bg-muted rounded p-1.5 overflow-x-auto text-foreground/60 font-mono whitespace-pre-wrap">
                  {JSON.stringify(log.after_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}
