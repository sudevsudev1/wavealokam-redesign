import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ID_PROOF_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN Card'];
const SOURCES = ['Direct', 'Booking.com', 'MakeMyTrip', 'Agoda', 'Cleartrip', 'Other'];
const PURPOSES = ['Leisure', 'Business', 'Family', 'Event', 'Other'];

export default function GuestSelfCheckIn() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const branchId = params.get('branch');

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; room_type: string }[]>([]);
  const [occupiedRoomIds, setOccupiedRoomIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    guest_name: '', phone: '', email: '', adults: 1, children: 0,
    room_id: '', id_proof_type: '', purpose: 'Leisure', source: 'Direct',
    expected_check_out: '', notes: '',
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!branchId) return;
    supabase.from('ops_rooms').select('id, room_type').eq('is_active', true).eq('branch_id', branchId)
      .then(({ data }) => { if (data) setRooms(data as any); });
    supabase.from('ops_guest_log').select('room_id').eq('status', 'checked_in').eq('branch_id', branchId)
      .then(({ data }) => {
        if (data) setOccupiedRoomIds(new Set(data.map((g: any) => g.room_id).filter(Boolean)));
      });
  }, [branchId]);

  if (!token || !branchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center text-muted-foreground">Invalid check-in link.</CardContent></Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Thank you!</h2>
            <p className="text-muted-foreground">Your check-in details have been submitted. Our team will verify and confirm shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.guest_name.trim()) { toast.error('Guest name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (!form.id_proof_type) { toast.error('ID proof type is required'); return; }
    if (!form.purpose) { toast.error('Purpose is required'); return; }
    if (!form.source) { toast.error('Booking source is required'); return; }
    if (form.adults < 1) { toast.error('At least 1 adult required'); return; }

    setSubmitting(true);
    try {
      let idProofUrl: string | null = null;
      if (idProofFile) {
        const filePath = `${branchId}/id-proofs/${crypto.randomUUID()}-${idProofFile.name}`;
        const { error: uploadError } = await supabase.storage.from('ops-attachments').upload(filePath, idProofFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('ops-attachments').getPublicUrl(filePath);
        idProofUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('ops_guest_log').insert({
        branch_id: branchId,
        guest_name: form.guest_name,
        phone: form.phone || null,
        email: form.email || null,
        adults: form.adults,
        children: form.children,
        room_id: form.room_id || null,
        id_proof_type: form.id_proof_type || null,
        id_proof_url: idProofUrl,
        purpose: form.purpose,
        source: form.source,
        expected_check_out: form.expected_check_out || null,
        notes: form.notes || null,
        checked_in_by: '00000000-0000-0000-0000-000000000000',
        submission_source: 'guest_self',
        approval_status: 'pending',
        share_token: token,
        status: 'pending_approval',
      } as any);

      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-start justify-center pt-8">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-center">Guest Check-In Form</CardTitle>
          <p className="text-xs text-center text-muted-foreground">Welcome! Please fill in your details below.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">Guest Name *</label>
            <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Phone *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." />
            </div>
            <div>
              <label className="text-xs font-medium">Email *</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Adults *</label>
              <Input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="text-xs font-medium">Children</label>
              <Input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Booking Source *</label>
            <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Purpose *</label>
            <Select value={form.purpose} onValueChange={(val) => setForm({ ...form, purpose: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Select Room</label>
            <Select value={form.room_id} onValueChange={(val) => setForm({ ...form, room_id: val })}>
              <SelectTrigger><SelectValue placeholder="Choose room (optional)" /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id} disabled={occupiedRoomIds.has(r.id)}>
                    {r.id} ({r.room_type}) {occupiedRoomIds.has(r.id) ? '— Occupied' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Expected Check-out *</label>
            <Input type="datetime-local" value={form.expected_check_out} onChange={(e) => setForm({ ...form, expected_check_out: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">ID Proof Type *</label>
            <Select value={form.id_proof_type} onValueChange={(val) => setForm({ ...form, id_proof_type: val })}>
              <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
              <SelectContent>
                {ID_PROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="file" accept="image/*" onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} className="flex-1" />
              <Button variant="outline" size="sm" type="button" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => setIdProofFile((e.target as HTMLInputElement).files?.[0] || null);
                input.click();
              }}>📷 Camera</Button>
            </div>
            {idProofFile && <p className="text-xs text-muted-foreground">Selected: {idProofFile.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special requests or considerations you would like to mention. We will try our best to make it happen."
              rows={3}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : 'Submit Check-In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
