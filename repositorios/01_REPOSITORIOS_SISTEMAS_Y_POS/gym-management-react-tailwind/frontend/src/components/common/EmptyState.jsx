import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', subtitle, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-700 py-16 text-center">
      <Icon className="h-10 w-10 text-ink-600" />
      <div>
        <p className="font-medium text-gray-200">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
