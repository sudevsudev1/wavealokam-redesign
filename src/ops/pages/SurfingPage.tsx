import { useState, useMemo } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import {
  useSurfSchools, useGuestStays, useBoardRentals, useSurfLessons,
  useBoardPayments, useLessonPayments, useSurfConfig,
  useAddBoardRental, useUpdateBoardRental, useDeleteBoardRental, useApplyBoardPayment,
  useAddSurfLesson, useUpdateSurfLesson, useDeleteSurfLesson, useApplyLessonPayment,
  useUpsertSurfSchool, useDeleteSurfSchool, useUpsertGuestStay, useUpdateSurfConfig,
  SurfSchool, GuestStay, BoardRental, SurfLesson,
} from '../hooks/useSurfing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Plus, DollarSign, Filter, Waves, ChevronDown, ChevronUp, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ─── Board Rental Tab ───

function BoardRentalTab() {
  const { isAdmin, profile } = useOpsAuth();
  const { data: schools = [] } = useSurfSchools();
  const { data: rentals = [] } = useBoardRentals();
  const { data: payments = [] } = useBoardPayments();
  const { data: config = [] } = useSurfConfig();
  const addRental = useAddBoardRental();
  const updateRental = useUpdateBoardRental();
  const deleteRental = useDeleteBoardRental();
  const applyPayment = useApplyBoardPayment();

  const activeSchools = schools.filter(s => s.is_active);
  const boardRate = config.find(c => c.key === 'board_rate')?.value_json?.rate ?? 500;

  // Form state
  const [schoolId, setSchoolId] = useState('');
  const [numBoards, setNumBoards] = useState(1);
  const [rentalDate, setRentalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter state
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState<{ schoolId: string; schoolName: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Settings dialog
  const [showSettings, setShowSettings] = useState(false);

  // Edit dialog
  const [editRental, setEditRental] = useState<BoardRental | null>(null);
  const [editFields, setEditFields] = useState<{
    school_id: string; rental_date: string; num_boards: number; rate_per_board: number;
    boards_returned: number; all_boards_good_condition: boolean; is_paid: boolean;
  }>({ school_id: '', rental_date: '', num_boards: 1, rate_per_board: 500, boards_returned: 0, all_boards_good_condition: true, is_paid: false });

  const openEditRental = (r: BoardRental) => {
    setEditRental(r);
    setEditFields({
      school_id: r.school_id, rental_date: r.rental_date, num_boards: r.num_boards,
      rate_per_board: r.rate_per_board, boards_returned: r.boards_returned,
      all_boards_good_condition: r.all_boards_good_condition, is_paid: r.is_paid,
    });
  };

  const handleSaveEdit = async () => {
    if (!editRental) return;
    try {
      await updateRental.mutateAsync({
        id: editRental.id,
        ...editFields,
        paid_at: editFields.is_paid && !editRental.is_paid ? new Date().toISOString() : editFields.is_paid ? editRental.paid_at : null,
      });
      toast.success('Rental updated');
      setEditRental(null);
    } catch (e: any) { toast.error(e?.message || 'Failed to update'); }
  };

  const handleDeleteRental = async () => {
    if (!editRental) return;
    try {
      await deleteRental.mutateAsync(editRental.id);
      toast.success('Rental deleted');
      setEditRental(null);
    } catch { toast.error('Failed to delete'); }
  };

  // Calculate amounts owed per school
  const amountsOwed = useMemo(() => {
    const map: Record<string, { schoolName: string; owed: number; totalPaid: number }> = {};
    activeSchools.forEach(s => {
      const unpaidTotal = rentals
        .filter(r => r.school_id === s.id && !r.is_paid)
        .reduce((sum, r) => sum + r.amount_due, 0);
      map[s.id] = { schoolName: s.name, owed: unpaidTotal, totalPaid: 0 };
    });
    return map;
  }, [rentals, activeSchools]);

  // Filter rentals
  const filtered = useMemo(() => {
    let result = rentals;
    if (filterSchool !== 'all') result = result.filter(r => r.school_id === filterSchool);
    if (filterDateFrom) result = result.filter(r => r.rental_date >= filterDateFrom);
    if (filterDateTo) result = result.filter(r => r.rental_date <= filterDateTo);
    return result;
  }, [rentals, filterSchool, filterDateFrom, filterDateTo]);

  const filteredTotal = filtered.reduce((s, r) => s + r.amount_due, 0);
  const schoolMap = useMemo(() => new Map(schools.map(s => [s.id, s.name])), [schools]);

  const handleAddRental = async () => {
    if (!schoolId) { toast.error('Select a school'); return; }
    try {
      await addRental.mutateAsync({ school_id: schoolId, rental_date: rentalDate, num_boards: numBoards, rate_per_board: boardRate });
      toast.success('Board rental added');
      setShowAddForm(false);
      setNumBoards(1);
    } catch { toast.error('Failed to add rental'); }
  };

  const handleRecordPayment = async () => {
    if (!paymentDialog || !paymentAmount) return;
    try {
      await applyPayment.mutateAsync({ school_id: paymentDialog.schoolId, amount: Number(paymentAmount), notes: paymentNotes || undefined });
      toast.success('Payment recorded & applied to oldest unpaid entries');
      setPaymentDialog(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch { toast.error('Failed to record payment'); }
  };

  return (
    <div className="space-y-3">
      {/* Amounts Owed Summary - compact inline */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(amountsOwed).map(([sid, info]) => (
          <div key={sid} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${info.owed > 0 ? 'border-orange-300 bg-orange-50' : 'border-border'}`}>
            <span className="font-medium truncate max-w-[80px]">{info.schoolName}</span>
            <span className={`font-bold ${info.owed > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>₹{info.owed.toLocaleString()}</span>
            {info.owed > 0 && (
              <button className="text-[9px] text-primary underline ml-1"
                onClick={() => setPaymentDialog({ schoolId: sid, schoolName: info.schoolName })}>
                Pay
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Rental
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 mr-1" /> Filter
        </Button>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Settings
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">School</label>
                <Select value={schoolId} onValueChange={setSchoolId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {activeSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                <Input type="date" value={rentalDate} onChange={e => setRentalDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Boards</label>
                <Input type="number" min={1} value={numBoards} onChange={e => setNumBoards(parseInt(e.target.value) || 1)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Amount</label>
                <div className="h-8 flex items-center text-xs font-medium">₹{(numBoards * boardRate).toLocaleString()}</div>
              </div>
            </div>
            <Button size="sm" onClick={handleAddRental} disabled={addRental.isPending}>
              {addRental.isPending ? 'Adding...' : 'Add'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">School</label>
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {activeSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">From</label>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">To</label>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="text-xs font-medium">Filtered Total: ₹{filteredTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
      )}

      {/* Rentals Table */}
      <p className="text-[10px] text-muted-foreground">Tap a row to edit</p>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] px-2">Date</TableHead>
              <TableHead className="text-[10px] px-2">School</TableHead>
              <TableHead className="text-[10px] px-2">Boards</TableHead>
              <TableHead className="text-[10px] px-2">Ret.</TableHead>
              <TableHead className="text-[10px] px-2">OK</TableHead>
              <TableHead className="text-[10px] px-2">Amount</TableHead>
              <TableHead className="text-[10px] px-2">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">No rentals</TableCell></TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditRental(r)}>
                  <TableCell className="text-[11px] px-2 py-1.5">{format(parseISO(r.rental_date), 'dd MMM')}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{schoolMap.get(r.school_id) || '?'}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{r.num_boards}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{r.boards_returned}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{r.all_boards_good_condition ? '✓' : '✗'}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5 font-medium">₹{r.amount_due}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">
                    <Badge variant={r.is_paid ? 'default' : 'outline'} className="text-[9px] h-4 px-1">
                      {r.is_paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Rental Dialog */}
      <Dialog open={!!editRental} onOpenChange={() => setEditRental(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Rental</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">School</label>
                <Select value={editFields.school_id} onValueChange={v => setEditFields(p => ({ ...p, school_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                <Input type="date" value={editFields.rental_date} onChange={e => setEditFields(p => ({ ...p, rental_date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Boards</label>
                <Input type="number" min={1} value={editFields.num_boards} onChange={e => setEditFields(p => ({ ...p, num_boards: parseInt(e.target.value) || 1 }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Rate/Board (₹)</label>
                <Input type="number" value={editFields.rate_per_board} onChange={e => setEditFields(p => ({ ...p, rate_per_board: Number(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Returned</label>
                <Input type="number" min={0} max={editFields.num_boards} value={editFields.boards_returned} onChange={e => setEditFields(p => ({ ...p, boards_returned: parseInt(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Checkbox checked={editFields.all_boards_good_condition} onCheckedChange={v => setEditFields(p => ({ ...p, all_boards_good_condition: !!v }))} />
                <span className="text-[10px]">Good condition</span>
              </div>
            </div>
            <div className="text-xs font-medium">Amount: ₹{(editFields.num_boards * editFields.rate_per_board).toLocaleString()}</div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editFields.is_paid} onCheckedChange={v => setEditFields(p => ({ ...p, is_paid: !!v }))} />
              <span className="text-xs font-medium">Paid</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="sm" onClick={handleSaveEdit} disabled={updateRental.isPending}>
                {updateRental.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditRental(null)}>Cancel</Button>
              <div className="flex-1" />
              <Button size="sm" variant="destructive" onClick={handleDeleteRental} disabled={deleteRental.isPending}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Record Payment — {paymentDialog?.schoolName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Outstanding: ₹{amountsOwed[paymentDialog?.schoolId || '']?.owed.toLocaleString() || 0}
            </p>
            <Input type="number" placeholder="Amount received" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Notes (optional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="h-8 text-xs" />
            <p className="text-[10px] text-muted-foreground">Payment will be applied to the oldest unpaid entries first (FIFO).</p>
            <Button size="sm" onClick={handleRecordPayment} disabled={applyPayment.isPending || !paymentAmount}>
              {applyPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      {isAdmin && <BoardRentalSettings open={showSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function BoardRentalSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: schools = [] } = useSurfSchools();
  const { data: config = [] } = useSurfConfig();
  const upsertSchool = useUpsertSurfSchool();
  const deleteSchool = useDeleteSurfSchool();
  const updateConfig = useUpdateSurfConfig();

  const [newSchool, setNewSchool] = useState('');
  const boardRate = config.find(c => c.key === 'board_rate')?.value_json?.rate ?? 500;
  const [rate, setRate] = useState(String(boardRate));

  const handleAddSchool = async () => {
    if (!newSchool.trim()) return;
    await upsertSchool.mutateAsync({ name: newSchool.trim() });
    setNewSchool('');
    toast.success('School added');
  };

  const handleSaveRate = async () => {
    await updateConfig.mutateAsync({ key: 'board_rate', value_json: { rate: Number(rate) } });
    toast.success('Rate updated');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Board Rental Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium">Rate per Board (₹)</label>
            <div className="flex gap-2 mt-1">
              <Input type="number" value={rate} onChange={e => setRate(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" onClick={handleSaveRate}>Save</Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Surf Schools</label>
            <div className="space-y-1 mt-1">
              {schools.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                  <span className={!s.is_active ? 'line-through text-muted-foreground' : ''}>{s.name}</span>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] text-destructive"
                    onClick={() => { deleteSchool.mutate(s.id); toast.success('School deactivated'); }}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={newSchool} onChange={e => setNewSchool(e.target.value)} placeholder="New school name" className="h-8 text-xs" />
              <Button size="sm" onClick={handleAddSchool}>Add</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Surf Lessons Tab ───

function SurfLessonsTab() {
  const { isAdmin } = useOpsAuth();
  const { data: guestStays = [] } = useGuestStays();
  const { data: lessons = [] } = useSurfLessons();
  const addLesson = useAddSurfLesson();
  const updateLesson = useUpdateSurfLesson();
  const deleteLesson = useDeleteSurfLesson();
  const applyPayment = useApplyLessonPayment();

  const activeStays = guestStays.filter(s => s.is_active);
  const stayMap = useMemo(() => new Map(guestStays.map(s => [s.id, s.name])), [guestStays]);

  // Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [lessonDate, setLessonDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [numLessons, setNumLessons] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestStayId, setGuestStayId] = useState('');
  const [feePerLesson, setFeePerLesson] = useState('1500');
  const [commissionPerLesson, setCommissionPerLesson] = useState('0');
  const [autoFare, setAutoFare] = useState('0');

  // Filters
  const [filterStay, setFilterStay] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState<{ stayId: string; stayName: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Edit dialog
  const [editLesson, setEditLesson] = useState<SurfLesson | null>(null);
  const [editLF, setEditLF] = useState<{
    lesson_date: string; num_lessons: number; guest_name: string; guest_stay_id: string;
    fee_per_lesson: number; commission_per_lesson: number; auto_fare: number; is_paid: boolean;
  }>({ lesson_date: '', num_lessons: 1, guest_name: '', guest_stay_id: '', fee_per_lesson: 0, commission_per_lesson: 0, auto_fare: 0, is_paid: false });

  const openEditLesson = (l: SurfLesson) => {
    setEditLesson(l);
    setEditLF({
      lesson_date: l.lesson_date, num_lessons: l.num_lessons, guest_name: l.guest_name,
      guest_stay_id: l.guest_stay_id, fee_per_lesson: l.fee_per_lesson,
      commission_per_lesson: l.commission_per_lesson, auto_fare: l.auto_fare, is_paid: l.is_paid,
    });
  };

  const handleSaveEditLesson = async () => {
    if (!editLesson) return;
    const total_fees = editLF.num_lessons * editLF.fee_per_lesson;
    const total_commission = editLF.num_lessons * editLF.commission_per_lesson;
    try {
      await updateLesson.mutateAsync({
        id: editLesson.id,
        ...editLF,
        total_fees,
        total_commission,
        paid_at: editLF.is_paid && !editLesson.is_paid ? new Date().toISOString() : editLF.is_paid ? editLesson.paid_at : null,
      });
      toast.success('Lesson updated');
      setEditLesson(null);
    } catch (e: any) { toast.error(e?.message || 'Failed to update'); }
  };

  const handleDeleteLesson = async () => {
    if (!editLesson) return;
    try {
      await deleteLesson.mutateAsync(editLesson.id);
      toast.success('Lesson deleted');
      setEditLesson(null);
    } catch { toast.error('Failed to delete'); }
  };

  // Update commission default when guest stay changes
  const handleStayChange = (stayId: string) => {
    setGuestStayId(stayId);
    const stay = guestStays.find(s => s.id === stayId);
    if (stay) setCommissionPerLesson(String(stay.default_commission));
  };

  // Commissions owed per stay
  const commissionsOwed = useMemo(() => {
    const map: Record<string, { name: string; owed: number }> = {};
    activeStays.forEach(s => {
      const unpaid = lessons
        .filter(l => l.guest_stay_id === s.id && !l.is_paid)
        .reduce((sum, l) => sum + l.total_commission, 0);
      if (unpaid > 0) map[s.id] = { name: s.name, owed: unpaid };
    });
    return map;
  }, [lessons, activeStays]);

  const filtered = useMemo(() => {
    let result = lessons;
    if (filterStay !== 'all') result = result.filter(l => l.guest_stay_id === filterStay);
    if (filterDateFrom) result = result.filter(l => l.lesson_date >= filterDateFrom);
    if (filterDateTo) result = result.filter(l => l.lesson_date <= filterDateTo);
    return result;
  }, [lessons, filterStay, filterDateFrom, filterDateTo]);

  const totals = useMemo(() => ({
    fees: filtered.reduce((s, l) => s + l.total_fees, 0),
    commissions: filtered.reduce((s, l) => s + l.total_commission, 0),
    autoFare: filtered.reduce((s, l) => s + l.auto_fare, 0),
    lessons: filtered.reduce((s, l) => s + l.num_lessons, 0),
  }), [filtered]);

  const handleAddLesson = async () => {
    if (!guestName || !guestStayId) { toast.error('Fill required fields'); return; }
    try {
      await addLesson.mutateAsync({
        lesson_date: lessonDate, num_lessons: numLessons, guest_name: guestName,
        guest_stay_id: guestStayId, fee_per_lesson: Number(feePerLesson),
        commission_per_lesson: Number(commissionPerLesson), auto_fare: Number(autoFare),
      });
      toast.success('Lesson added');
      setShowAddForm(false);
      setGuestName('');
      setNumLessons(1);
      setAutoFare('0');
    } catch { toast.error('Failed to add lesson'); }
  };

  const handlePayCommission = async () => {
    if (!paymentDialog || !paymentAmount) return;
    try {
      await applyPayment.mutateAsync({ guest_stay_id: paymentDialog.stayId, amount: Number(paymentAmount) });
      toast.success('Commission payment recorded');
      setPaymentDialog(null);
      setPaymentAmount('');
    } catch { toast.error('Failed to record payment'); }
  };

  return (
    <div className="space-y-3">
      {/* Commissions Owed - compact inline */}
      {Object.keys(commissionsOwed).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(commissionsOwed).map(([sid, info]) => (
            <div key={sid} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-orange-300 bg-orange-50 text-xs">
              <span className="font-medium truncate max-w-[80px]">{info.name}</span>
              <span className="font-bold text-orange-600">₹{info.owed.toLocaleString()}</span>
              <button className="text-[9px] text-primary underline ml-1"
                onClick={() => setPaymentDialog({ stayId: sid, stayName: info.name })}>
                Pay
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Lesson
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 mr-1" /> Filter
        </Button>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Settings
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                <Input type="date" value={lessonDate} onChange={e => setLessonDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground"># Lessons</label>
                <Input type="number" min={1} value={numLessons} onChange={e => setNumLessons(parseInt(e.target.value) || 1)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Guest Name</label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Guest name" className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Guest Stay</label>
                <Select value={guestStayId} onValueChange={handleStayChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select stay" /></SelectTrigger>
                  <SelectContent>
                    {activeStays.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Fee/Lesson (₹)</label>
                <Input type="number" value={feePerLesson} onChange={e => setFeePerLesson(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Commission/Lesson (₹)</label>
                <Input type="number" value={commissionPerLesson} onChange={e => setCommissionPerLesson(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Auto Fare (₹)</label>
                <Input type="number" value={autoFare} onChange={e => setAutoFare(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="text-xs font-medium">
              Total Fees: ₹{(numLessons * Number(feePerLesson)).toLocaleString()} | Commission: ₹{(numLessons * Number(commissionPerLesson)).toLocaleString()}
            </div>
            <Button size="sm" onClick={handleAddLesson} disabled={addLesson.isPending}>
              {addLesson.isPending ? 'Adding...' : 'Add'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Guest Stay</label>
                <Select value={filterStay} onValueChange={setFilterStay}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stays</SelectItem>
                    {activeStays.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">From</label>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">To</label>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="text-xs font-medium space-x-3">
              <span>{totals.lessons} lessons</span>
              <span>Fees: ₹{totals.fees.toLocaleString()}</span>
              <span>Commission: ₹{totals.commissions.toLocaleString()}</span>
              <span>Auto: ₹{totals.autoFare.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lessons Table */}
      <p className="text-[10px] text-muted-foreground">Tap a row to edit</p>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] px-2">Date</TableHead>
              <TableHead className="text-[10px] px-2">Guest</TableHead>
              <TableHead className="text-[10px] px-2">Stay</TableHead>
              <TableHead className="text-[10px] px-2">#</TableHead>
              <TableHead className="text-[10px] px-2">Fees</TableHead>
              <TableHead className="text-[10px] px-2">Comm.</TableHead>
              <TableHead className="text-[10px] px-2">Auto</TableHead>
              <TableHead className="text-[10px] px-2">Comm. Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-4">No lessons</TableCell></TableRow>
            ) : (
              filtered.map(l => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditLesson(l)}>
                  <TableCell className="text-[11px] px-2 py-1.5">{format(parseISO(l.lesson_date), 'dd MMM')}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5 max-w-[80px] truncate">{l.guest_name}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{stayMap.get(l.guest_stay_id) || '?'}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">{l.num_lessons}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">₹{l.total_fees}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">₹{l.total_commission}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">₹{l.auto_fare}</TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5">
                    <Badge variant={l.is_paid ? 'default' : 'outline'} className="text-[9px] h-4 px-1">
                      {l.is_paid ? 'Comm. Paid' : 'Comm. Owed'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-semibold mb-1">Totals (showing {filtered.length} entries)</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <span className="text-muted-foreground">Total Lessons:</span><span className="font-medium">{totals.lessons}</span>
            <span className="text-muted-foreground">Total Fees:</span><span className="font-medium">₹{totals.fees.toLocaleString()}</span>
            <span className="text-muted-foreground">Total Commission:</span><span className="font-medium">₹{totals.commissions.toLocaleString()}</span>
            <span className="text-muted-foreground">Total Auto Fare:</span><span className="font-medium">₹{totals.autoFare.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Lesson Dialog */}
      <Dialog open={!!editLesson} onOpenChange={() => setEditLesson(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Lesson</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                <Input type="date" value={editLF.lesson_date} onChange={e => setEditLF(p => ({ ...p, lesson_date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground"># Lessons</label>
                <Input type="number" min={1} value={editLF.num_lessons} onChange={e => setEditLF(p => ({ ...p, num_lessons: parseInt(e.target.value) || 1 }))} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Guest Name</label>
                <Input value={editLF.guest_name} onChange={e => setEditLF(p => ({ ...p, guest_name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Guest Stay</label>
                <Select value={editLF.guest_stay_id} onValueChange={v => setEditLF(p => ({ ...p, guest_stay_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeStays.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Fee/Lesson (₹)</label>
                <Input type="number" value={editLF.fee_per_lesson} onChange={e => setEditLF(p => ({ ...p, fee_per_lesson: Number(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Comm./Lesson (₹)</label>
                <Input type="number" value={editLF.commission_per_lesson} onChange={e => setEditLF(p => ({ ...p, commission_per_lesson: Number(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Auto Fare (₹)</label>
                <Input type="number" value={editLF.auto_fare} onChange={e => setEditLF(p => ({ ...p, auto_fare: Number(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="text-xs font-medium">
              Total Fees: ₹{(editLF.num_lessons * editLF.fee_per_lesson).toLocaleString()} | Commission: ₹{(editLF.num_lessons * editLF.commission_per_lesson).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editLF.is_paid} onCheckedChange={v => setEditLF(p => ({ ...p, is_paid: !!v }))} />
              <span className="text-xs font-medium">Commission Paid</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="sm" onClick={handleSaveEditLesson} disabled={updateLesson.isPending}>
                {updateLesson.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditLesson(null)}>Cancel</Button>
              <div className="flex-1" />
              <Button size="sm" variant="destructive" onClick={handleDeleteLesson} disabled={deleteLesson.isPending}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commission Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Pay Commission — {paymentDialog?.stayName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Outstanding: ₹{commissionsOwed[paymentDialog?.stayId || '']?.owed.toLocaleString() || 0}
            </p>
            <Input type="number" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="h-8 text-xs" />
            <p className="text-[10px] text-muted-foreground">All corresponding lessons will be marked as paid.</p>
            <Button size="sm" onClick={handlePayCommission} disabled={applyPayment.isPending || !paymentAmount}>
              {applyPayment.isPending ? 'Recording...' : 'Mark Paid'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      {isAdmin && <LessonSettings open={showSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function LessonSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: stays = [] } = useGuestStays();
  const upsertStay = useUpsertGuestStay();
  const [newStay, setNewStay] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCommission, setEditCommission] = useState('');

  const handleAdd = async () => {
    if (!newStay.trim()) return;
    await upsertStay.mutateAsync({ name: newStay.trim() });
    setNewStay('');
    toast.success('Guest stay added');
  };

  const handleSave = async (id: string) => {
    await upsertStay.mutateAsync({ id, name: editName, default_commission: Number(editCommission) });
    setEditingId(null);
    toast.success('Updated');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Surf Lesson Settings</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="text-xs font-medium">Guest Stay Options</label>
          {stays.map(s => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              {editingId === s.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-xs flex-1" />
                  <Input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)} className="h-7 text-xs w-16" placeholder="Comm." />
                  <Button size="sm" className="h-7" onClick={() => handleSave(s.id)}>Save</Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 ${!s.is_active ? 'line-through text-muted-foreground' : ''}`}>{s.name}</span>
                  <span className="text-muted-foreground">₹{s.default_commission}/lesson</span>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px]"
                    onClick={() => { setEditingId(s.id); setEditName(s.name); setEditCommission(String(s.default_commission)); }}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newStay} onChange={e => setNewStay(e.target.value)} placeholder="New guest stay" className="h-8 text-xs" />
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Revenue Summary ───

function RevenueSummary() {
  const { data: rentals = [] } = useBoardRentals();
  const { data: lessons = [] } = useSurfLessons();
  const { data: config = [] } = useSurfConfig();

  const monthlyExpenses = config.find(c => c.key === 'monthly_expenses')?.value_json ?? { miscellaneous: 0, instructor_salaries: 0 };
  const { isAdmin } = useOpsAuth();
  const updateConfig = useUpdateSurfConfig();
  const [showExpenses, setShowExpenses] = useState(false);
  const [misc, setMisc] = useState(String(monthlyExpenses.miscellaneous || 0));
  const [salaries, setSalaries] = useState(String(monthlyExpenses.instructor_salaries || 0));

  const totalBoardIncome = rentals.reduce((s, r) => s + r.amount_due, 0);
  const totalLessonFees = lessons.reduce((s, l) => s + l.total_fees, 0);
  const totalCommissions = lessons.reduce((s, l) => s + l.total_commission, 0);
  const totalAutoFare = lessons.reduce((s, l) => s + l.auto_fare, 0);
  const totalRevenue = totalBoardIncome + totalLessonFees;
  const totalProfit = totalLessonFees + totalBoardIncome - totalCommissions - totalAutoFare - (monthlyExpenses.miscellaneous || 0) - (monthlyExpenses.instructor_salaries || 0);

  const handleSaveExpenses = async () => {
    await updateConfig.mutateAsync({ key: 'monthly_expenses', value_json: { miscellaneous: Number(misc), instructor_salaries: Number(salaries) } });
    toast.success('Expenses updated');
    setShowExpenses(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Revenue Summary</CardTitle>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowExpenses(!showExpenses)}>
              <Settings className="h-3 w-3 mr-1" /> Expenses
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-muted-foreground">Total Revenue:</span><span className="font-bold">₹{totalRevenue.toLocaleString()}</span>
          <span className="text-muted-foreground">Board Rental Income:</span><span className="font-medium">₹{totalBoardIncome.toLocaleString()}</span>
          <span className="text-muted-foreground">Surf Lessons Income:</span><span className="font-medium">₹{totalLessonFees.toLocaleString()}</span>
          <span className="text-muted-foreground">Total Auto Fare:</span><span className="font-medium text-destructive">-₹{totalAutoFare.toLocaleString()}</span>
          <span className="text-muted-foreground">Total Commissions:</span><span className="font-medium text-destructive">-₹{totalCommissions.toLocaleString()}</span>
          <span className="text-muted-foreground">Miscellaneous:</span><span className="font-medium text-destructive">-₹{(monthlyExpenses.miscellaneous || 0).toLocaleString()}</span>
          <span className="text-muted-foreground">Instructor Salaries:</span><span className="font-medium text-destructive">-₹{(monthlyExpenses.instructor_salaries || 0).toLocaleString()}</span>
          <span className="text-muted-foreground font-semibold border-t border-border pt-1">Total Profit:</span>
          <span className={`font-bold border-t border-border pt-1 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>₹{totalProfit.toLocaleString()}</span>
        </div>

        {showExpenses && (
          <div className="mt-3 p-2 bg-muted/50 rounded space-y-2">
            <div>
              <label className="text-[10px] font-medium">Miscellaneous (₹)</label>
              <Input type="number" value={misc} onChange={e => setMisc(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium">Instructor Salaries (₹)</label>
              <Input type="number" value={salaries} onChange={e => setSalaries(e.target.value)} className="h-7 text-xs" />
            </div>
            <Button size="sm" onClick={handleSaveExpenses}>Save Expenses</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───

export default function SurfingPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Waves className="h-5 w-5 text-primary" />
        <h1 className="text-base font-bold">Surfing</h1>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <span className="text-xs font-semibold flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Revenue Summary</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <RevenueSummary />
        </CollapsibleContent>
      </Collapsible>

      <Tabs defaultValue="board-rental">
        <TabsList className="w-full">
          <TabsTrigger value="board-rental" className="flex-1 text-xs">Board Rental</TabsTrigger>
          <TabsTrigger value="surf-lessons" className="flex-1 text-xs">Surf Lessons</TabsTrigger>
        </TabsList>
        <TabsContent value="board-rental">
          <BoardRentalTab />
        </TabsContent>
        <TabsContent value="surf-lessons">
          <SurfLessonsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
