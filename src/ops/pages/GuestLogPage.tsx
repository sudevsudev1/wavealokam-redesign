import { useState, useMemo, useRef } from 'react';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useGuestLog, useCheckIn, useCheckOut, GuestEntry } from '../hooks/useGuestLog';
import { useOpsProfiles } from '../hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, LogOut as LogOutIcon, Search, Eye, Camera, Upload, Share2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const ID_PROOF_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN Card'];
const SOURCES = ['Direct', 'Booking.com', 'MakeMyTrip', 'Agoda', 'Cleartrip', 'Other'];
const PURPOSES = ['Leisure', 'Business', 'Family', 'Event', 'Other'];

export default function GuestLogPage() {
  const { t } = useOpsLanguage();
  const { profile } = useOpsAuth();
  const { data: profiles = [] } = useOpsProfiles();

  const [tab, setTab] = useState<'active' | 'pending' | 'history'>('active');
  const { data: activeGuests = [], isLoading: loadingActive } = useGuestLog('checked_in');
  const { data: pendingGuests = [] } = useGuestLog('pending_approval');
  const { data: allGuests = [], isLoading: loadingAll } = useGuestLog();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [search, setSearch] = useState('');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [detailGuest, setDetailGuest] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Check-in form state
  const [form, setForm] = useState({
    guest_name: '', phone: '', email: '', adults: 1, children: 0,
    room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Direct',
    expected_check_out: '', notes: '',
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const list = tab === 'active' ? activeGuests : tab === 'pending' ? pendingGuests : allGuests;
    if (!search) return list;
    return list.filter((g) =>
      g.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone?.includes(search) ||
      g.room_id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tab, activeGuests, pendingGuests, allGuests, search]);

  // AI OCR extraction
  const handleScanForm = async (file: File) => {
    setExtracting(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('ops-guest-ocr', {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data.data;
      setForm((prev) => ({
        ...prev,
        guest_name: extracted.guest_name || prev.guest_name,
        phone: extracted.phone || prev.phone,
        email: extracted.email || prev.email,
        adults: extracted.adults || prev.adults,
        children: extracted.children ?? prev.children,
        id_proof_type: extracted.id_proof_type && ID_PROOF_TYPES.includes(extracted.id_proof_type) ? extracted.id_proof_type : prev.id_proof_type,
        purpose: extracted.purpose && PURPOSES.includes(extracted.purpose) ? extracted.purpose : prev.purpose,
        source: extracted.source && SOURCES.includes(extracted.source) ? extracted.source : prev.source,
        expected_check_out: extracted.expected_check_out || prev.expected_check_out,
        notes: extracted.notes || prev.notes,
      }));
      toast.success('Details extracted! Please verify and edit as needed.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to extract details');
    } finally {
      setExtracting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!form.guest_name.trim()) { toast.error('Guest name required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number required'); return; }
    if (!form.email.trim()) { toast.error('Email required'); return; }
    if (!form.id_proof_type) { toast.error('ID proof type required'); return; }
    if (!form.purpose) { toast.error('Purpose required'); return; }
    if (!form.source) { toast.error('Booking source required'); return; }
    if (!form.expected_check_out) { toast.error('Expected checkout required'); return; }
    if (form.adults < 1) { toast.error('At least 1 adult required'); return; }
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
      setForm({ guest_name: '', phone: '', email: '', adults: 1, children: 0, room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Direct', expected_check_out: '', notes: '' });
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

  // Approve / Reject pending guest
  const handleApprove = async (guestId: string) => {
    try {
      const { error } = await supabase.from('ops_guest_log').update({
        status: 'checked_in',
        approval_status: 'approved',
        approved_by: profile?.userId,
        approved_at: new Date().toISOString(),
        checked_in_by: profile?.userId,
      } as any).eq('id', guestId);
      if (error) throw error;
      toast.success('Guest approved & checked in!');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (guestId: string) => {
    try {
      const { error } = await supabase.from('ops_guest_log').update({
        status: 'rejected',
        approval_status: 'rejected',
        approved_by: profile?.userId,
        approved_at: new Date().toISOString(),
      } as any).eq('id', guestId);
      if (error) throw error;
      toast.success('Guest submission rejected');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // WhatsApp share link
  const handleShareWhatsApp = () => {
    if (!profile) return;
    const token = crypto.randomUUID();
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/ops/guest-form?token=${token}&branch=${profile.branchId}`;
    const message = encodeURIComponent(`Welcome to Wavealokam! 🌊\n\nPlease fill in your check-in details here:\n${formUrl}\n\nThank you!`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const detailEntry = detailGuest ? [...allGuests, ...pendingGuests].find((g) => g.id === detailGuest) : null;
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
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
              {pendingGuests.length}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('guest.pendingApproval')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button variant={tab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setTab('active')}>
            {t('guest.active')}
          </Button>
          <Button variant={tab === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setTab('pending')}>
            {t('guest.pending')} {pendingGuests.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingGuests.length}</Badge>}
          </Button>
          <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')}>
            {t('guest.history')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="h-4 w-4 mr-1" />WhatsApp
          </Button>
          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />{t('guest.checkIn')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('guest.checkInTitle')}</DialogTitle>
                <p className="text-xs text-muted-foreground">{format(new Date(), 'dd MMMM yyyy, EEEE')}</p>
              </DialogHeader>

              {/* Scan form photo */}
              <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-2">
                <p className="text-sm font-medium">{t('guest.scanForm')}</p>
                <p className="text-xs text-muted-foreground">{t('guest.scanFormDesc')}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" disabled={extracting} onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleScanForm(file);
                    };
                    input.click();
                  }}>
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                    {t('guest.takePhoto')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={extracting} onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleScanForm(file);
                    };
                    input.click();
                  }}>
                    <Upload className="h-4 w-4 mr-1" />{t('guest.uploadPhoto')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">{t('guest.guestName')} *</label>
                  <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">{t('guest.phone')} *</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('guest.email')} *</label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">{t('guest.adults')} *</label>
                    <Input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('guest.children')}</label>
                    <Input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.bookingSource')} *</label>
                  <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.purpose')} *</label>
                  <Select value={form.purpose} onValueChange={(val) => setForm({ ...form, purpose: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.selectRoom')}</label>
                  <Select value={form.room_id} onValueChange={(val) => setForm({ ...form, room_id: val })}>
                    <SelectTrigger><SelectValue placeholder={t('guest.selectRoom')} /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id} disabled={occupiedRoomIds.has(r.id)}>
                          Room {r.id} ({r.room_type}) {occupiedRoomIds.has(r.id) ? '— Occupied' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.expectedCheckout')} *</label>
                  <Input type="datetime-local" value={form.expected_check_out} onChange={(e) => setForm({ ...form, expected_check_out: e.target.value })} />
                </div>
                {/* ID Proof */}
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('guest.idProofType')} *</label>
                  <Select value={form.id_proof_type} onValueChange={(val) => setForm({ ...form, id_proof_type: val })}>
                    <SelectTrigger><SelectValue placeholder={t('guest.idProofType')} /></SelectTrigger>
                    <SelectContent>
                      {ID_PROOF_TYPES.map((idType) => <SelectItem key={idType} value={idType}>{idType}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} className="flex-1" />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} />
                    <Button variant="outline" size="sm" type="button" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-1" />Camera
                    </Button>
                  </div>
                  {idProofFile && <p className="text-xs text-muted-foreground">Selected: {idProofFile.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.notes')}</label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="(any special requests or considerations you would like to mention. We will try our best to make it happen)"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCheckIn} disabled={!form.guest_name.trim() || checkIn.isPending} className="w-full">
                  {checkIn.isPending ? '...' : t('guest.confirmCheckIn')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
              const isPending = guest.status === 'pending_approval';
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
                      {guest.source && guest.source !== 'Direct' && <Badge variant="outline" className="text-[10px] mt-0.5">{guest.source}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{guest.room_id ? `Room ${guest.room_id}` : '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{guest.adults}A{guest.children > 0 ? ` + ${guest.children}C` : ''}</TableCell>
                  <TableCell className="text-xs">
                    {format(parseISO(guest.check_in_at), 'dd MMM HH:mm')}
                    {isActive && <span className="text-muted-foreground block">{duration}h</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {isPending ? (
                      <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50">{t('guest.pendingLabel')}</Badge>
                    ) : (
                      <Badge variant="outline" className={`text-xs ${isActive ? 'text-green-600 bg-green-50' : 'text-muted-foreground bg-muted'}`}>
                        {isActive ? t('guest.inHouse') : t('guest.out')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailGuest(guest.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {isPending && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-green-600" onClick={() => handleApprove(guest.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />Approve
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleReject(guest.id)}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
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
                  {tab === 'active' ? t('guest.noActive') : tab === 'pending' ? t('guest.noPending') : t('guest.noHistory')}
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
                <div><span className="text-muted-foreground">{t('guest.room')}:</span> {detailEntry.room_id ? `Room ${detailEntry.room_id}` : '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.phone')}:</span> {detailEntry.phone || '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.email')}:</span> {detailEntry.email || '-'}</div>
                <div><span className="text-muted-foreground">{t('guest.guests')}:</span> {detailEntry.adults}A + {detailEntry.children}C</div>
                <div><span className="text-muted-foreground">{t('guest.bookingSource')}:</span> {detailEntry.source}</div>
                <div><span className="text-muted-foreground">{t('guest.purpose')}:</span> {detailEntry.purpose}</div>
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
