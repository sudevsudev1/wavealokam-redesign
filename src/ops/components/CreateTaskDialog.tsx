import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { useCreateTask, useOpsProfiles } from '../hooks/useTasks';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../lib/taskConstants';
import { toast } from 'sonner';

export default function CreateTaskDialog() {
  const { t } = useOpsLanguage();
  const createTask = useCreateTask();
  const { data: profiles } = useOpsProfiles();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operations');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [proofRequired, setProofRequired] = useState(false);
  const [receiptRequired, setReceiptRequired] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('Operations'); setPriority('Medium');
    setDueDate(''); setDueTime(''); setAssignedTo([]); setProofRequired(false); setReceiptRequired(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || assignedTo.length === 0) {
      toast.error('Title and at least one assignee required');
      return;
    }

    const dueDatetime = dueDate ? `${dueDate}T${dueTime || '23:59'}:00` : undefined;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        due_datetime: dueDatetime,
        assigned_to: assignedTo,
        proof_required: proofRequired,
        receipt_required: receiptRequired,
      });
      toast.success('Task created');
      reset();
      setOpen(false);
    } catch {
      toast.error('Failed to create task');
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssignedTo(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {t('home.myTasks')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title (English)" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3} />
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

          <Button type="submit" className="w-full h-11" disabled={createTask.isPending}>
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
