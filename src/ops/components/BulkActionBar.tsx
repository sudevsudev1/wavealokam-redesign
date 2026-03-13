import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, X, Trash2, ArrowRight } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: Array<{
    label: string;
    value: string;
    variant?: 'default' | 'destructive';
    icon?: React.ReactNode;
  }>;
  onAction: (action: string) => void;
  isPending?: boolean;
}

export default function BulkActionBar({
  selectedCount, totalCount, onSelectAll, onDeselectAll,
  actions, onAction, isPending,
}: BulkActionBarProps) {
  const [selectedAction, setSelectedAction] = useState('');

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-sm">
      <Badge variant="secondary" className="text-xs font-bold shrink-0">
        {selectedCount}/{totalCount}
      </Badge>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onSelectAll} className="text-[10px] text-primary underline">All</button>
        <span className="text-muted-foreground text-[10px]">·</span>
        <button onClick={onDeselectAll} className="text-[10px] text-muted-foreground underline">None</button>
      </div>

      <Select value={selectedAction} onValueChange={setSelectedAction}>
        <SelectTrigger className="h-7 text-xs flex-1 min-w-[120px] max-w-[180px]">
          <SelectValue placeholder="Bulk action..." />
        </SelectTrigger>
        <SelectContent>
          {actions.map(a => (
            <SelectItem key={a.value} value={a.value}>
              <span className="flex items-center gap-1.5">
                {a.icon}
                {a.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        variant={actions.find(a => a.value === selectedAction)?.variant === 'destructive' ? 'destructive' : 'default'}
        className="h-7 text-xs gap-1 shrink-0"
        disabled={!selectedAction || isPending}
        onClick={() => { onAction(selectedAction); setSelectedAction(''); }}
      >
        <ArrowRight className="h-3 w-3" /> Apply
      </Button>

      <button onClick={onDeselectAll} className="shrink-0 ml-auto">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
