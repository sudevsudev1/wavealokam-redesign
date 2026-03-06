import { useState } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOpsAuth } from '../contexts/OpsAuthContext';

export interface BatchEntry {
  id: string;
  item_id: string;
  quantity: number;
  received_date: string | null;
  mfg_date: string | null;
  expiry_date: string;
  batch_label: string | null;
  is_disposed: boolean;
}

export function useItemBatches(itemId: string) {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_inventory_expiry', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_inventory_expiry')
        .select('*')
        .eq('item_id', itemId)
        .eq('is_disposed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BatchEntry[];
    },
    enabled: !!profile && !!itemId,
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ops_inventory_expiry')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_inventory_expiry'] });
    },
  });
}

/** Format date as dd/MM/yyyy */
export function fmtDate(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return isValid(date) ? format(date, 'dd/MM/yyyy') : '—';
}

/** Short format for cards: dd/MM/yy */
export function fmtDateShort(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return isValid(date) ? format(date, 'dd/MM/yy') : '—';
}

/** Batch date display for an item — shows per-batch rcvd/mfg/exp with qty */
export function ItemBatchDates({ itemId, editable = false }: { itemId: string; editable?: boolean }) {
  const { data: batches = [] } = useItemBatches(itemId);

  if (batches.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {batches.map(batch => (
        <BatchRow key={batch.id} batch={batch} editable={editable} />
      ))}
    </div>
  );
}

function BatchRow({ batch, editable }: { batch: BatchEntry; editable: boolean }) {
  const updateBatch = useUpdateBatch();
  const [editing, setEditing] = useState(false);
  const [editRcvd, setEditRcvd] = useState('');
  const [editMfg, setEditMfg] = useState('');
  const [editExp, setEditExp] = useState('');

  const daysLeft = batch.expiry_date
    ? differenceInDays(parseISO(batch.expiry_date), new Date())
    : null;

  const expiryColor = daysLeft === null ? '' :
    daysLeft <= 0 ? 'text-destructive' :
    daysLeft <= 7 ? 'text-orange-600' : 'text-muted-foreground';

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditRcvd(batch.received_date || '');
    setEditMfg(batch.mfg_date || '');
    setEditExp(batch.expiry_date || '');
    setEditing(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateBatch.mutateAsync({
        id: batch.id,
        updates: {
          received_date: editRcvd || null,
          mfg_date: editMfg || null,
          expiry_date: editExp,
        },
      });
      toast.success('Batch updated');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (editing && editable) {
    return (
      <div className="bg-muted/50 rounded p-1.5 space-y-1" onClick={e => e.stopPropagation()}>
        <div className="text-[9px] font-medium text-muted-foreground">
          Qty: {batch.quantity} {batch.batch_label && `· ${batch.batch_label}`}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div>
            <label className="text-[8px] text-muted-foreground block">Rcvd</label>
            <Input type="date" value={editRcvd} onChange={e => setEditRcvd(e.target.value)} className="h-6 text-[10px] px-1" />
          </div>
          <div>
            <label className="text-[8px] text-muted-foreground block">Mfg</label>
            <Input type="date" value={editMfg} onChange={e => setEditMfg(e.target.value)} className="h-6 text-[10px] px-1" />
          </div>
          <div>
            <label className="text-[8px] text-muted-foreground block">Exp</label>
            <Input type="date" value={editExp} onChange={e => setEditExp(e.target.value)} className="h-6 text-[10px] px-1" />
          </div>
        </div>
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={(e) => { e.stopPropagation(); setEditing(false); }}>
            <X className="h-2.5 w-2.5" />
          </Button>
          <Button size="sm" className="h-5 text-[9px] px-1.5" onClick={handleSave} disabled={updateBatch.isPending}>
            <Save className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0 items-center text-[9px]">
      <span className="text-muted-foreground font-medium">×{batch.quantity}</span>
      {batch.received_date && (
        <span className="text-muted-foreground">R:{fmtDateShort(batch.received_date)}</span>
      )}
      {batch.mfg_date && (
        <span className="text-muted-foreground">M:{fmtDateShort(batch.mfg_date)}</span>
      )}
      <span className={`font-medium ${expiryColor}`}>
        E:{fmtDateShort(batch.expiry_date)}
        {daysLeft !== null && ` (${daysLeft}d)`}
      </span>
      {editable && (
        <button onClick={startEdit} className="text-primary hover:underline ml-0.5">
          <Pencil className="h-2.5 w-2.5 inline" />
        </button>
      )}
    </div>
  );
}
