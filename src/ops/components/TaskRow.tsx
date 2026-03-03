import React, { useState } from 'react';
import { OpsTask, useUpdateTask, useUploadAttachment, useTaskAttachments, useOpsProfiles } from '../hooks/useTasks';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { getTranslatedField } from '../lib/translate';
import { TASK_STATUSES, BLOCKED_REASONS, ATTACHMENT_TYPES } from '../lib/taskConstants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Paperclip, ChevronDown, ChevronUp, Clock, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const priorityColors: Record<string, string> = {
  'Low': 'bg-muted text-muted-foreground',
  'Medium': 'bg-blue-100 text-blue-800',
  'High': 'bg-orange-100 text-orange-800',
  'Urgent': 'bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
  'To Do': 'bg-muted text-muted-foreground',
  'Doing': 'bg-blue-100 text-blue-800',
  'Blocked': 'bg-destructive/10 text-destructive',
  'Done': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-muted text-muted-foreground line-through',
};

export default function TaskRow({ task }: { task: OpsTask }) {
  const { language } = useOpsLanguage();
  const { isAdmin, profile } = useOpsAuth();
  const { data: profiles } = useOpsProfiles();
  const updateTask = useUpdateTask();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason_code || '');
  const [blockedText, setBlockedText] = useState('');

  const title = getTranslatedField(task.title_original, task.title_en, task.title_ml, task.original_language, language);
  const description = getTranslatedField(task.description_original, task.description_en, task.description_ml, task.original_language, language);

  const isOverdue = task.due_datetime && new Date(task.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(task.status);

  const assigneeNames = profiles
    ?.filter(p => task.assigned_to.includes(p.user_id))
    .map(p => p.display_name) || [];

  const handleStatusChange = async (newStatus: string) => {
    // Only admins can set Cancelled
    if (newStatus === 'Cancelled' && !isAdmin) return;

    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'Blocked' && blockedReason) {
      updates.blocked_reason_code = blockedReason;
      if (blockedText) {
        updates.blocked_reason_text_original = blockedText;
        updates.original_language = language;
      }
    }

    if (newStatus === 'Done' && notes) {
      updates.completion_notes_original = notes;
      updates.original_language = language;
    }

    try {
      await updateTask.mutateAsync({ id: task.id, updates });
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const availableStatuses = isAdmin
    ? TASK_STATUSES
    : TASK_STATUSES.filter(s => s !== 'Cancelled');

  return (
    <div className={`border rounded-lg p-2.5 space-y-1.5 ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
      {/* Top row */}
      <div className="flex items-start gap-1.5">
        <button onClick={() => setExpanded(!expanded)} className="mt-1 shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] ${priorityColors[task.priority] || ''}`} variant="secondary">{task.priority}</Badge>
            {isOverdue && <AlertTriangle className="h-3 w-3 text-destructive" />}
            <span className="font-medium text-xs truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
            <span>{task.category}</span>
            {task.due_datetime && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {format(new Date(task.due_datetime), 'MMM d, HH:mm')}
              </span>
            )}
            <span>→ {assigneeNames.join(', ') || '—'}</span>
          </div>
        </div>
        <Select value={task.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-24 h-7 text-[10px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map(s => (
              <SelectItem key={s} value={s}>
                <Badge className={statusColors[s] || ''} variant="secondary">{s}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="pl-6 space-y-3 pt-2 border-t border-border">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          {/* Blocked reason */}
          {task.status === 'Blocked' && (
            <div className="space-y-2">
              <Select value={blockedReason} onValueChange={setBlockedReason}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select blocked reason" />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKED_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                value={blockedText}
                onChange={e => setBlockedText(e.target.value)}
                placeholder="Additional details..."
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('Blocked')}
                disabled={!blockedReason}
              >
                Save Blocked Reason
              </Button>
            </div>
          )}

          {/* Completion notes */}
          {(task.status === 'Done' || task.status === 'Doing') && (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes..."
                rows={2}
                className="text-sm"
              />
              {notes && (
                <Button size="sm" variant="outline" onClick={() => {
                  updateTask.mutateAsync({
                    id: task.id,
                    updates: {
                      completion_notes_original: notes,
                      original_language: language,
                    }
                  }).then(() => { toast.success('Notes saved'); setNotes(''); });
                }}>
                  Save Notes
                </Button>
              )}
            </div>
          )}

          {/* Attachments */}
          <TaskAttachments taskId={task.id} />

          {/* Proof/Receipt indicators */}
          <div className="flex gap-2 text-xs">
            {task.proof_required && <Badge variant="outline">Proof required</Badge>}
            {task.receipt_required && <Badge variant="outline">Receipt required</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskAttachments({ taskId }: { taskId: string }) {
  const { data: attachments } = useTaskAttachments(taskId);
  const upload = useUploadAttachment();
  const [type, setType] = useState<string>('Proof');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ taskId, file, type });
      toast.success('Attachment uploaded');
    } catch {
      toast.error('Upload failed');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">{attachments?.length || 0} attachments</span>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Upload className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Upload Attachment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTACHMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="file" accept="image/*,.pdf" onChange={handleFile} disabled={upload.isPending} />
              {upload.isPending && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {attachments && attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map(a => (
            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-primary underline">
              {a.type}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
