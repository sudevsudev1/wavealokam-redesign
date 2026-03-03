// Task categories, priorities, statuses, and blocked reasons
export const TASK_CATEGORIES = [
  'Operations',
  'Guest Services',
  'Housekeeping',
  'Maintenance and Repairs',
  'Laundry',
  'Inventory and Purchasing',
  'Surfing Operations',
  'Safety and Security',
  'Marketing',
  'Admin and Accounts',
] as const;

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const TASK_STATUSES = ['To Do', 'Doing', 'Blocked', 'Done', 'Cancelled'] as const;

export const BLOCKED_REASONS = [
  'Waiting for vendor response',
  'Waiting for delivery',
  'Waiting for payment approval',
  'Need spare part or tool',
  'Need teammate help',
  'Guest emergency took priority',
  'Weather prevented outdoor work',
  'Safety risk identified, paused work',
  'Needed clarification, asked, waiting',
] as const;

export const ATTACHMENT_TYPES = ['Proof', 'Receipt', 'Reference', 'Other'] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskStatus = typeof TASK_STATUSES[number];
export type BlockedReason = typeof BLOCKED_REASONS[number];
export type AttachmentType = typeof ATTACHMENT_TYPES[number];
