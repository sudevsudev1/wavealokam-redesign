import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useRecurringMetaTasks,
  useRecurringTasks,
  useCreateRecurringTask,
  useCreateRecurringMetaTask,
  useUpdateRecurringTask,
  useDeleteRecurringTask,
  useDeleteRecurringMetaTask,
  type RecurringTask,
} from '../hooks/useRecurringTasks';
import { useOpsProfiles } from '../hooks/useTasks';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../lib/taskConstants';
import {
  ChevronDown, ChevronRight, Plus, Calendar, User, Trash2, Pencil,
  Loader2, Clock, AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function RecurringTasksTab() {
  const { data: metaTasks, isLoading: metaLoading } = useRecurringMetaTasks();
  const { data: recurringTasks, isLoading: tasksLoading } = useRecurringTasks();
  const { data: profiles } = useOpsProfiles();
  const { isAdmin } = useOpsAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [createMetaOpen, setCreateMetaOpen] = useState(false);

  const isLoading = metaLoading || tasksLoading;

  // Group tasks by meta_task_id
  const standaloneRecurring = recurringTasks?.filter(t => !t.meta_task_id) || [];
  const tasksByMeta = new Map<string, RecurringTask[]>();
  recurringTasks?.forEach(t => {
    if (t.meta_task_id) {
      const existing = tasksByMeta.get(t.meta_task_id) || [];
      existing.push(t);
      tasksByMeta.set(t.meta_task_id, existing);
    }
  });

  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Recurring Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">New Recurring Task</DialogTitle>
            </DialogHeader>
            <CreateRecurringTaskForm
              metaTasks={metaTasks || []}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={createMetaOpen} onOpenChange={setCreateMetaOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Meta Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">New Meta Task</DialogTitle>
            </DialogHeader>
            <CreateMetaTaskForm onClose={() => setCreateMetaOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Meta tasks (collapsible) */}
      {metaTasks?.map(meta => (
        <MetaTaskCard
          key={meta.id}
          meta={meta}
          tasks={tasksByMeta.get(meta.id) || []}
          profileMap={profileMap}
          isAdmin={isAdmin}
        />
      ))}

      {/* Standalone recurring tasks */}
      {standaloneRecurring.map(task => (
        <RecurringTaskRow
          key={task.id}
          task={task}
          profileMap={profileMap}
          isAdmin={isAdmin}
        />
      ))}

      {(!metaTasks?.length && !standaloneRecurring.length) && (
        <Card>
          <CardContent className="py-8 text-center text-xs text-muted-foreground">
            No recurring tasks yet
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetaTaskCard({
  meta,
  tasks,
  profileMap,
  isAdmin,
}: {
  meta: { id: string; title: string; description: string | null; category: string; priority: string };
  tasks: RecurringTask[];
  profileMap: Map<string, string>;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const deleteMeta = useDeleteRecurringMetaTask();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span className="text-xs font-semibold">{meta.title}</span>
              <Badge variant="outline" className="text-[9px]">{meta.category}</Badge>
              <Badge variant="secondary" className="text-[9px]">{tasks.length} tasks</Badge>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm('Delete this meta task and all its sub-tasks?')) {
                    try {
                      await deleteMeta.mutateAsync(meta.id);
                      toast.success('Meta task deleted');
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t pt-2">
            {meta.description && (
              <p className="text-[10px] text-muted-foreground">{meta.description}</p>
            )}
            {tasks.map(task => (
              <RecurringTaskRow
                key={task.id}
                task={task}
                profileMap={profileMap}
                isAdmin={isAdmin}
                compact
              />
            ))}
            {tasks.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">No sub-tasks</p>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function RecurringTaskRow({
  task,
  profileMap,
  isAdmin,
  compact = false,
}: {
  task: RecurringTask;
  profileMap: Map<string, string>;
  isAdmin: boolean;
  compact?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const deleteTask = useDeleteRecurringTask();
  const daysUntilNext = differenceInDays(new Date(task.next_execution_at), new Date());
  const isOverdue = isPast(new Date(task.next_execution_at));
  const isDueSoon = daysUntilNext <= 1 && !isOverdue;

  const assigneeNames = task.assigned_to.map(id => profileMap.get(id) || '?').filter(Boolean);

  const Wrapper = compact ? 'div' : Card;
  const content = (
    <div className={`flex items-center justify-between ${compact ? 'py-1.5 px-2 rounded-md bg-muted/50' : 'p-3'}`}>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${!task.is_active ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>
          {task.related_room_id && (
            <Badge variant="outline" className="text-[9px]">Room {task.related_room_id}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            Every {task.frequency_days}d
          </span>
          {isOverdue && (
            <span className="flex items-center gap-0.5 text-destructive font-medium">
              <AlertTriangle className="h-2.5 w-2.5" /> Overdue
            </span>
          )}
          {isDueSoon && (
            <span className="flex items-center gap-0.5 text-accent-foreground font-medium">
              <AlertTriangle className="h-2.5 w-2.5" /> Due soon
            </span>
          )}
          {!isOverdue && !isDueSoon && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              Next: {format(new Date(task.next_execution_at), 'dd MMM')}
            </span>
          )}
          {assigneeNames.length > 0 && (
            <span className="flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" />
              {assigneeNames.join(', ')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Pencil className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit Recurring Task</DialogTitle>
            </DialogHeader>
            <EditRecurringTaskForm task={task} onClose={() => setEditOpen(false)} />
          </DialogContent>
        </Dialog>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive"
            onClick={async () => {
              if (confirm('Delete this recurring task?')) {
                try {
                  await deleteTask.mutateAsync(task.id);
                  toast.success('Deleted');
                } catch (err: any) {
                  toast.error(err.message);
                }
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  if (compact) return content;
  return <Card>{content}</Card>;
}

function CreateRecurringTaskForm({
  metaTasks,
  onClose,
}: {
  metaTasks: { id: string; title: string }[];
  onClose: () => void;
}) {
  const { data: profiles } = useOpsProfiles();
  const createTask = useCreateRecurringTask();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Operations');
  const [priority, setPriority] = useState('Medium');
  const [frequencyDays, setFrequencyDays] = useState('7');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [metaTaskId, setMetaTaskId] = useState('none');

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title required');
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        category,
        priority,
        frequency_days: parseInt(frequencyDays) || 7,
        assigned_to: assignedTo,
        related_room_id: roomId || undefined,
        meta_task_id: metaTaskId !== 'none' ? metaTaskId : undefined,
      });
      toast.success('Recurring task created');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Frequency (days)</Label>
          <Input type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Room (optional)</Label>
          <Input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. 101" className="h-8 text-xs" />
        </div>
      </div>
      {metaTasks.length > 0 && (
        <div>
          <Label className="text-xs">Meta Task Group</Label>
          <Select value={metaTaskId} onValueChange={setMetaTaskId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (standalone)</SelectItem>
              {metaTasks.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-xs">Assign to</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {profiles?.map(p => (
            <label key={p.user_id} className="flex items-center gap-1 text-[10px]">
              <Checkbox
                checked={assignedTo.includes(p.user_id)}
                onCheckedChange={checked => {
                  setAssignedTo(prev =>
                    checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
                  );
                }}
                className="h-3 w-3"
              />
              {p.display_name}
            </label>
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={createTask.isPending} className="w-full h-8 text-xs">
        {createTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
      </Button>
    </div>
  );
}

function CreateMetaTaskForm({ onClose }: { onClose: () => void }) {
  const createMeta = useCreateRecurringMetaTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operations');
  const [priority, setPriority] = useState('Medium');

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title required');
    try {
      await createMeta.mutateAsync({
        title: title.trim(),
        description: description || undefined,
        category,
        priority,
      });
      toast.success('Meta task created');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={createMeta.isPending} className="w-full h-8 text-xs">
        {createMeta.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
      </Button>
    </div>
  );
}

function EditRecurringTaskForm({ task, onClose }: { task: RecurringTask; onClose: () => void }) {
  const { data: profiles } = useOpsProfiles();
  const updateTask = useUpdateRecurringTask();
  const [title, setTitle] = useState(task.title);
  const [frequencyDays, setFrequencyDays] = useState(String(task.frequency_days));
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assigned_to);
  const [isActive, setIsActive] = useState(task.is_active);

  const handleSubmit = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          title,
          frequency_days: parseInt(frequencyDays) || 7,
          assigned_to: assignedTo,
          is_active: isActive,
        },
      });
      toast.success('Updated');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">Frequency (days)</Label>
        <Input type="number" value={frequencyDays} onChange={e => setFrequencyDays(e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">Assign to</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {profiles?.map(p => (
            <label key={p.user_id} className="flex items-center gap-1 text-[10px]">
              <Checkbox
                checked={assignedTo.includes(p.user_id)}
                onCheckedChange={checked => {
                  setAssignedTo(prev =>
                    checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
                  );
                }}
                className="h-3 w-3"
              />
              {p.display_name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-xs">
        <Checkbox checked={isActive} onCheckedChange={v => setIsActive(!!v)} className="h-3.5 w-3.5" />
        Active
      </label>
      <Button onClick={handleSubmit} disabled={updateTask.isPending} className="w-full h-8 text-xs">
        {updateTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
      </Button>
    </div>
  );
}
