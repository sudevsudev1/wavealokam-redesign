import { useState, useMemo } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useGuestLog, useCheckIn, useCheckOut } from '../hooks/useGuestLog';
import { useOpsProfiles } from '../hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, LogOut as LogOutIcon, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const ID_PROOF_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN Card'];
const SOURCES = ['Walk-in', 'OTA', 'Direct', 'Referral'];
const PURPOSES = ['Leisure', 'Business', 'Family', 'Event', 'Other'];

export default function GuestLogPage() {
  const { t } = useOpsLanguage();
  const { profile } = useOpsAuth();
  const { data: profiles = [] } = useOpsProfiles();

  const [tab, setTab] = useState<'active' | 'history'>('active');
  const { data: activeGuests = [], isLoading: loadingActive } = useGuestLog('checked_in');
  const { data: allGuests = [], isLoading: loadingAll } = useGuestLog();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [search, setSearch] = useState('');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [detailGuest, setDetailGuest] = useState<string | null>(null);

  // Check-in form state
  const [form, setForm] = useState({
    guest_name: '', phone: '', email: '', adults: 1, children: 0,
    room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Walk-in',
    expected_check_out: '', notes: '',
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);

  // Rooms query
  const [rooms, setRooms] = useState<{ id: string; room_type: string }[]>([]);
  useState(() => {
    supabase.from('ops_rooms').select('id, room_type').eq('is_active', true)
      .then(({ data }) => { if (data) setRooms(data as any); });
  });

  // Occupied rooms
  const occupiedRoomIds = useMemo(() => new Set(activeGuests.map((g) => g.room_id).filter(Boolean)), [activeGuests]);

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.display_name || userId.slice(0, 8);
  };

  const filtered = useMemo(() => {
    const list = tab === 'active' ? activeGuests : allGuests;
    if (!search) return list;
    return list.filter((g) =>
      g.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone?.includes(search) ||
      g.room_id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tab, activeGuests, allGuests, search]);

  const handleCheckIn = async () => {
    if (!form.guest_name.trim()) { toast.error('Guest name required'); return; }
    try {
      await checkIn.mutateAsync({
        guest_name: form.guest_name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        adults: form.adults,
        children: form.children,
        room_id: form.room_id || undefined,
        id_proof_type: form.id_proof_type || undefined,
        id_proof_file: idProofFile || undefined,
        purpose: form.purpose,
        source: form.source,
        expected_check_out: form.expected_check_out || undefined,
        notes: form.notes || undefined,
      });
      toast.success(t('guest.checkedIn'));
      setCheckInOpen(false);
      setForm({ guest_name: '', phone: '', email: '', adults: 1, children: 0, room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Walk-in', expected_check_out: '', notes: '' });
      setIdProofFile(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCheckOut = async (guestId: string) => {
    try {
      await checkOut.mutateAsync(guestId);
      toast.success(t('guest.checkedOut'));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const detailEntry = detailGuest ? allGuests.find((g) => g.id === detailGuest) || activeGuests.find((g) => g.id === detailGuest) : null;

  const isLoading = loadingActive || loadingAll;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{activeGuests.length}</p>
              <p className="text-xs text-muted-foreground">{t('guest.activeGuests')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{activeGuests.reduce((s, g) => s + g.adults + g.children, 0)}</p>
              <p className="text-xs text-muted-foreground">{t('guest.totalPeople')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {rooms.filter((r) => occupiedRoomIds.has(r.id)).length}/{rooms.length}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('guest.roomsOccupied')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
              {allGuests.filter((g) => g.status === 'checked_out').length}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('guest.totalCheckouts')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={tab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setTab('active')}>
            {t('guest.active')}
          </Button>
          <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')}>
            {t('guest.history')}
          </Button>
        </div>
        <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />{t('guest.checkIn')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('guest.checkInTitle')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t('guest.guestName') + ' *'} value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t('guest.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder={t('guest.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t('guest.adults')}</label>
                  <Input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('guest.children')}</label>
                  <Input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <Select value={form.room_id} onValueChange={(val) => setForm({ ...form, room_id: val })}>
                <SelectTrigger><SelectValue placeholder={t('guest.selectRoom')} /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id} disabled={occupiedRoomIds.has(r.id)}>
                      {r.id} ({r.room_type}) {occupiedRoomIds.has(r.id) ? '— Occupied' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.purpose} onValueChange={(val) => setForm({ ...form, purpose: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t('guest.expectedCheckout')}</label>
                <Input type="datetime-local" value={form.expected_check_out} onChange={(e) => setForm({ ...form, expected_check_out: e.target.value })} />
              </div>
              {/* ID Proof */}
              <div className="space-y-1">
                <Select value={form.id_proof_type} onValueChange={(val) => setForm({ ...form, id_proof_type: val })}>
                  <SelectTrigger><SelectValue placeholder={t('guest.idProofType')} /></SelectTrigger>
                  <SelectContent>
                    {ID_PROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="file" accept="image/*" capture="environment" onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} />
              </div>
              <Input placeholder={t('guest.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button onClick={handleCheckIn} disabled={!form.guest_name.trim() || checkIn.isPending} className="w-full">
                {checkIn.isPending ? '...' : t('guest.confirmCheckIn')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('guest.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {/* Guest table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('guest.name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('guest.room')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('guest.guests')}</TableHead>
              <TableHead>{t('guest.checkInTime')}</TableHead>
              <TableHead className="text-center">{t('inv.status')}</TableHead>
              <TableHead className="text-right">{t('inv.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((guest) => {
              const isActive = guest.status === 'checked_in';
              const duration = isActive
                ? differenceInHours(new Date(), parseISO(guest.check_in_at))
                : guest.check_out_at
                  ? differenceInHours(parseISO(guest.check_out_at), parseISO(guest.check_in_at))
                  : 0;
              return (
                <TableRow key={guest.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{guest.guest_name}</span>
                      {guest.phone && <span className="text-xs text-muted-foreground block">{guest.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{guest.room_id || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{guest.adults}A{guest.children > 0 ? ` + ${guest.children}C` : ''}</TableCell>
                  <TableCell className="text-xs">
                    {format(parseISO(guest.check_in_at), 'dd MMM HH:mm')}
                    <span className="text-muted-foreground block">{duration}h</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs ${isActive ? 'text-green-600 bg-green-50' : 'text-muted-foreground bg-muted'}`}>
                      {isActive ? t('guest.inHouse') : t('guest.out')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailGuest(guest.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {isActive && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCheckOut(guest.id)}>
                          <LogOutIcon className="h-3 w-3 mr-1" />{t('guest.checkOutBtn')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {tab === 'active' ? t('guest.noActive') : t('guest.noHistory')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailGuest} onOpenChange={(open) => { if (!open) setDetailGuest(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('guest.details')}</DialogTitle></DialogHeader>
          {detailEntry && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t('guest.name')}:</span> <strong>{detailEntry.guest_name}</strong></div>
                <div><span className="text-muted-foreground">{t('guest.room')}:</span> {detailEntry.room_id || '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.phone')}:</span> {detailEntry.phone || '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.email')}:</span> {detailEntry.email || '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.guests')}:</span> {detailEntry.adults}A + {detailEntry.children}C</div>
                <div><span className="text-muted-foreground">Source:</span> {detailEntry.source}</div>
                <div><span className="text-muted-foreground">Purpose:</span> {detailEntry.purpose}</div>
                <div><span className="text-muted-foreground">{t('guest.checkedInBy')}:</span> {getProfileName(detailEntry.checked_in_by)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('guest.checkInTime')}:</span> {format(parseISO(detailEntry.check_in_at), 'dd MMM yyyy HH:mm')}
              </div>
              {detailEntry.check_out_at && (
                <div><span className="text-muted-foreground">{t('guest.checkOutTime')}:</span> {format(parseISO(detailEntry.check_out_at), 'dd MMM yyyy HH:mm')}</div>
              )}
              {detailEntry.id_proof_type && (
                <div>
                  <span className="text-muted-foreground">{t('guest.idProof')}:</span> {detailEntry.id_proof_type}
                  {detailEntry.id_proof_url && (
                    <a href={detailEntry.id_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary ml-2 underline text-xs">{t('guest.viewProof')}</a>
                  )}
                </div>
              )}
              {detailEntry.notes && <div><span className="text-muted-foreground">{t('guest.notes')}:</span> {detailEntry.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
