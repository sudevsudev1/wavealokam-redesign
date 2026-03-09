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
import { Users, UserPlus, LogOut as LogOutIcon, Search, Eye, Camera, Upload, Share2, Loader2, CheckCircle, XCircle, FileDown, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours, subDays } from 'date-fns';
import { exportCFormPDF } from '../lib/cformExport';
import { supabase } from '@/integrations/supabase/client';

const DOMESTIC_ID_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID'];
const INTL_ID_TYPES = ['Passport'];
const SOURCES = ['Direct', 'Booking.com', 'MakeMyTrip', 'Agoda', 'Cleartrip', 'Other'];
const PURPOSES = ['Leisure', 'Business', 'Family', 'Event', 'Other'];
const PAYMENT_MODES = ['Cash', 'GPay/UPI', 'Card'];

const defaultForm = {
  guest_name: '', phone: '', email: '', adults: 1, children: 0,
  room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Direct',
  expected_check_out: '', notes: '', guest_type: 'domestic' as 'domestic' | 'international',
  address: '', city: '', state: '', pincode: '',
  arriving_from: '', heading_to: '',
  date_of_birth: '', passport_number: '', evisa_number: '', nationality: '',
  payment_mode: '', transaction_id: '', number_of_nights: 1,
};

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
  const [form, setForm] = useState({ ...defaultForm });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [rooms, setRooms] = useState<{ id: string; room_type: string }[]>([]);
  useState(() => {
    supabase.from('ops_rooms').select('id, room_type').eq('is_active', true)
      .then(({ data }) => { if (data) setRooms(data as any); });
  });

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

  const idProofTypes = form.guest_type === 'international' ? INTL_ID_TYPES : DOMESTIC_ID_TYPES;

  // AI OCR extraction
  const handleScanForm = async (file: File) => {
    setExtracting(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('ops-guest-ocr', {
        body: { image_base64: base64, form_type: form.guest_type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const ex = data.data;
      setForm((prev) => ({
        ...prev,
        guest_name: ex.guest_name || prev.guest_name,
        phone: ex.phone || prev.phone,
        email: ex.email || prev.email,
        adults: ex.adults || prev.adults,
        children: ex.children ?? prev.children,
        id_proof_type: ex.id_proof_type && idProofTypes.includes(ex.id_proof_type) ? ex.id_proof_type : prev.id_proof_type,
        expected_check_out: ex.expected_check_out || prev.expected_check_out,
        notes: ex.notes || prev.notes,
        address: ex.address || prev.address,
        arriving_from: ex.arriving_from || prev.arriving_from,
        heading_to: ex.heading_to || ex.next_destination || prev.heading_to,
        // International-specific
        city: ex.city || prev.city,
        state: ex.state || prev.state,
        pincode: ex.pincode || prev.pincode,
        date_of_birth: ex.date_of_birth || prev.date_of_birth,
        passport_number: ex.passport_number || prev.passport_number,
        evisa_number: ex.evisa_number || prev.evisa_number,
        nationality: ex.nationality || prev.nationality,
        payment_mode: ex.payment_mode || prev.payment_mode,
        transaction_id: ex.transaction_id || prev.transaction_id,
        number_of_nights: ex.number_of_nights || prev.number_of_nights,
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
    if (!form.id_proof_type) { toast.error('ID proof type required'); return; }
    if (!form.source) { toast.error('Booking source required'); return; }
    if (!form.expected_check_out) { toast.error('Expected checkout required'); return; }
    if (form.adults < 1) { toast.error('At least 1 adult required'); return; }
    if (form.guest_type === 'domestic') {
      if (!form.address.trim()) { toast.error('Address required'); return; }
    } else {
      if (!form.email.trim()) { toast.error('Email required'); return; }
      if (!form.nationality.trim()) { toast.error('Nationality required'); return; }
      if (!form.passport_number.trim()) { toast.error('Passport/ID number required'); return; }
    }
    try {
      await checkIn.mutateAsync({
        guest_name: form.guest_name,
        guest_type: form.guest_type,
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
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        arriving_from: form.arriving_from || undefined,
        heading_to: form.heading_to || undefined,
        date_of_birth: form.date_of_birth || undefined,
        passport_number: form.passport_number || undefined,
        evisa_number: form.evisa_number || undefined,
        nationality: form.nationality || undefined,
        payment_mode: form.payment_mode || undefined,
        transaction_id: form.transaction_id || undefined,
        number_of_nights: form.number_of_nights || undefined,
      });
      toast.success(t('guest.checkedIn'));
      setCheckInOpen(false);
      setForm({ ...defaultForm });
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

  const handleApprove = async (guestId: string) => {
    try {
      const { error } = await supabase.from('ops_guest_log').update({
        status: 'checked_in', approval_status: 'approved',
        approved_by: profile?.userId, approved_at: new Date().toISOString(),
        checked_in_by: profile?.userId,
      } as any).eq('id', guestId);
      if (error) throw error;
      toast.success('Guest approved & checked in!');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (guestId: string) => {
    try {
      const { error } = await supabase.from('ops_guest_log').update({
        status: 'rejected', approval_status: 'rejected',
        approved_by: profile?.userId, approved_at: new Date().toISOString(),
      } as any).eq('id', guestId);
      if (error) throw error;
      toast.success('Guest submission rejected');
    } catch (e: any) { toast.error(e.message); }
  };

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

  const isDomestic = form.guest_type === 'domestic';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div><p className="text-2xl font-bold">{activeGuests.length}</p><p className="text-xs text-muted-foreground">{t('guest.activeGuests')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-muted-foreground" />
          <div><p className="text-2xl font-bold">{activeGuests.reduce((s, g) => s + g.adults + g.children, 0)}</p><p className="text-xs text-muted-foreground">{t('guest.totalPeople')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {rooms.filter((r) => occupiedRoomIds.has(r.id)).length}/{rooms.length}
          </div>
          <div><p className="text-xs text-muted-foreground">{t('guest.roomsOccupied')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">{pendingGuests.length}</div>
          <div><p className="text-xs text-muted-foreground">{t('guest.pendingApproval')}</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button variant={tab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setTab('active')}>{t('guest.active')}</Button>
          <Button variant={tab === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setTab('pending')}>
            {t('guest.pending')} {pendingGuests.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingGuests.length}</Badge>}
          </Button>
          <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')}>{t('guest.history')}</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}><Share2 className="h-4 w-4 mr-1" />WhatsApp</Button>
          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />{t('guest.checkIn')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('guest.checkInTitle')}</DialogTitle>
                <p className="text-xs text-muted-foreground">{format(new Date(), 'dd MMMM yyyy, EEEE')}</p>
              </DialogHeader>

              {/* Guest type toggle */}
              <div className="flex gap-2">
                <Button variant={isDomestic ? 'default' : 'outline'} size="sm" className="flex-1"
                  onClick={() => setForm({ ...form, guest_type: 'domestic', id_proof_type: '' })}>
                  🇮🇳 Domestic
                </Button>
                <Button variant={!isDomestic ? 'default' : 'outline'} size="sm" className="flex-1"
                  onClick={() => setForm({ ...form, guest_type: 'international', id_proof_type: 'Passport' })}>
                  🌍 International
                </Button>
              </div>

              {/* Scan form photo */}
              <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-2">
                <p className="text-sm font-medium">{t('guest.scanForm')}</p>
                <p className="text-xs text-muted-foreground">
                  Scan your {isDomestic ? 'domestic' : 'international'} check-in form to auto-fill
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" disabled={extracting} onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
                    input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleScanForm(f); };
                    input.click();
                  }}>
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                    {t('guest.takePhoto')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={extracting} onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = 'image/*';
                    input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleScanForm(f); };
                    input.click();
                  }}>
                    <Upload className="h-4 w-4 mr-1" />{t('guest.uploadPhoto')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Common fields */}
                <div>
                  <label className="text-xs font-medium">{t('guest.guestName')} *</label>
                  <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Address *</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={isDomestic ? 'Full address' : 'Street address'} />
                </div>

                {/* International: city, state, pincode */}
                {!isDomestic && (
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs font-medium">City</label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">State</label>
                      <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Pincode</label>
                      <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium">{t('guest.phone')} *</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">{t('guest.email')} {!isDomestic ? '*' : ''}</label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>

                {/* International: nationality, DOB, passport, e-visa */}
                {!isDomestic && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs font-medium">Nationality *</label>
                        <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
                      <div><label className="text-xs font-medium">Date of Birth</label>
                        <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs font-medium">Passport/ID Number *</label>
                        <Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></div>
                      <div><label className="text-xs font-medium">E-VISA Number</label>
                        <Input value={form.evisa_number} onChange={(e) => setForm({ ...form, evisa_number: e.target.value })} /></div>
                    </div>
                  </>
                )}

                {/* Arriving from / Heading to */}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium">Arriving From</label>
                    <Input value={form.arriving_from} onChange={(e) => setForm({ ...form, arriving_from: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">{isDomestic ? 'Heading To' : 'Next Destination'}</label>
                    <Input value={form.heading_to} onChange={(e) => setForm({ ...form, heading_to: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium">{t('guest.adults')} *</label>
                    <Input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })} /></div>
                  <div><label className="text-xs font-medium">{t('guest.children')}</label>
                    <Input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} /></div>
                </div>

                <div>
                  <label className="text-xs font-medium">{t('guest.bookingSource')} *</label>
                  <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('guest.purpose')} *</label>
                  <Select value={form.purpose} onValueChange={(val) => setForm({ ...form, purpose: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* International: payment info */}
                {!isDomestic && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium">Payment Mode</label>
                      <Select value={form.payment_mode} onValueChange={(val) => setForm({ ...form, payment_mode: val })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><label className="text-xs font-medium">Transaction ID</label>
                      <Input value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} /></div>
                  </div>
                )}

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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">{t('guest.expectedCheckout')} *</label>
                    <Input type="datetime-local" value={form.expected_check_out} onChange={(e) => setForm({ ...form, expected_check_out: e.target.value })} />
                  </div>
                  {!isDomestic && (
                    <div><label className="text-xs font-medium">Number of Nights</label>
                      <Input type="number" min={1} value={form.number_of_nights} onChange={(e) => setForm({ ...form, number_of_nights: parseInt(e.target.value) || 1 })} /></div>
                  )}
                </div>

                {/* ID Proof */}
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('guest.idProofType')} *</label>
                  <Select value={form.id_proof_type} onValueChange={(val) => setForm({ ...form, id_proof_type: val })}>
                    <SelectTrigger><SelectValue placeholder={t('guest.idProofType')} /></SelectTrigger>
                    <SelectContent>{idProofTypes.map((idType) => <SelectItem key={idType} value={idType}>{idType}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} className="flex-1" />
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
                      <div className="flex gap-1 mt-0.5">
                        {guest.guest_type === 'international' && <Badge variant="outline" className="text-[10px]">🌍 Intl</Badge>}
                        {guest.source && guest.source !== 'Direct' && <Badge variant="outline" className="text-[10px]">{guest.source}</Badge>}
                      </div>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('guest.details')}</DialogTitle>
            {detailEntry?.guest_type === 'international' && <Badge variant="outline" className="w-fit">🌍 International Guest</Badge>}
          </DialogHeader>
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
              {detailEntry.address && <div><span className="text-muted-foreground">Address:</span> {detailEntry.address}{detailEntry.city ? `, ${detailEntry.city}` : ''}{detailEntry.state ? `, ${detailEntry.state}` : ''}{detailEntry.pincode ? ` - ${detailEntry.pincode}` : ''}</div>}
              {detailEntry.arriving_from && <div><span className="text-muted-foreground">Arriving From:</span> {detailEntry.arriving_from}</div>}
              {detailEntry.heading_to && <div><span className="text-muted-foreground">{detailEntry.guest_type === 'international' ? 'Next Destination' : 'Heading To'}:</span> {detailEntry.heading_to}</div>}
              {/* International details */}
              {detailEntry.guest_type === 'international' && (
                <div className="grid grid-cols-2 gap-2 border-t pt-2">
                  {detailEntry.nationality && <div><span className="text-muted-foreground">Nationality:</span> {detailEntry.nationality}</div>}
                  {detailEntry.date_of_birth && <div><span className="text-muted-foreground">DOB:</span> {detailEntry.date_of_birth}</div>}
                  {detailEntry.passport_number && <div><span className="text-muted-foreground">Passport/ID:</span> {detailEntry.passport_number}</div>}
                  {detailEntry.evisa_number && <div><span className="text-muted-foreground">E-VISA:</span> {detailEntry.evisa_number}</div>}
                  {detailEntry.payment_mode && <div><span className="text-muted-foreground">Payment:</span> {detailEntry.payment_mode}</div>}
                  {detailEntry.transaction_id && <div><span className="text-muted-foreground">Transaction ID:</span> {detailEntry.transaction_id}</div>}
                  {detailEntry.number_of_nights && <div><span className="text-muted-foreground">Nights:</span> {detailEntry.number_of_nights}</div>}
                </div>
              )}
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
