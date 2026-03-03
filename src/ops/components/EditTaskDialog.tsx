import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil } from 'lucide-react';
import { OpsTask, useUpdateTask, useOpsProfiles } from '../hooks/useTasks';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../lib/taskConstants';
import { translateText } from '../lib/translate';
import { toast } from 'sonner';

export default function EditTaskDialog({ task }: { task: OpsTask }) {
  const updateTask = useUpdateTask();
  const { data: profiles } = useOpsProfiles();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(task.title_en || task.title_original);
  const [description, setDescription] = useState(task.description_en || task.description_original || '');
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(() => {
    if (!task.due_datetime) return '';
    const d = new Date(task.due_datetime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [dueTime, setDueTime] = useState(() => {
    if (!task.due_datetime) return '';
    const d = new Date(task.due_datetime);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assigned_to);
  const [proofRequired, setProofRequired] = useState(task.proof_required);
  const [receiptRequired, setReceiptRequired] = useState(task.receipt_required);

  const resetToTask = () => {
    setTitle(task.title_en || task.title_original);
    setDescription(task.description_en || task.description_original || '');
    setCategory(task.category);
    setPriority(task.priority);
    if (task.due_datetime) {
      const d = new Date(task.due_datetime);
      setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setDueTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setDueDate('');
      setDueTime('');
    }
    setAssignedTo(task.assigned_to);
    setProofRequired(task.proof_required);
    setReceiptRequired(task.receipt_required);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || assignedTo.length === 0) {
      toast.error('Title and at least one assignee required');
      return;
    }

    let dueDatetime: string | null = null;
    if (dueDate) {
      const localDate = new Date(`${dueDate}T${dueTime || '23:59'}:00`);
      dueDatetime = localDate.toISOString();
    }

    // Re-translate title/description if changed
    const titleMl = await translateText(title.trim(), 'en', 'ml');
    const descMl = description.trim() ? await translateText(description.trim(), 'en', 'ml') : null;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          title_original: title.trim(),
          title_en: title.trim(),
          title_ml: titleMl,
          description_original: description.trim() || null,
          description_en: description.trim() || null,
          description_ml: descMl,
          original_language: 'en',
          category,
          priority,
          due_datetime: dueDatetime,
          assigned_to: assignedTo,
          proof_required: proofRequired,
          receipt_required: receiptRequired,
        },
      });
      toast.success('Task updated');
      setOpen(false);
    } catch {
      toast.error('Failed to update task');
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssignedTo(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetToTask(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-11" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Time</Label>
              <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To *</Label>
            <div className="space-y-2">
              {profiles?.map(p => (
                <label key={p.user_id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={assignedTo.includes(p.user_id)}
                    onCheckedChange={() => toggleAssignee(p.user_id)}
                  />
                  <span className="text-sm">{p.display_name} ({p.role})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={proofRequired} onCheckedChange={v => setProofRequired(!!v)} />
              <span className="text-sm">Proof required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={receiptRequired} onCheckedChange={v => setReceiptRequired(!!v)} />
              <span className="text-sm">Receipt required</span>
            </label>
          </div>

          <Button type="submit" className="w-full h-11" disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
