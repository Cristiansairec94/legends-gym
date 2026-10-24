import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from '../../utils/toast';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'border-emerald-500/40 text-emerald-300',
  error: 'border-rose-500/40 text-rose-300',
  info: 'border-sky-500/40 text-sky-300',
};

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => toast.subscribe((item) => {
    setItems((prev) => [...prev, item]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3500);
  }), []);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {items.map((i) => {
        const Icon = ICONS[i.type] || Info;
        return (
          <div key={i.id} className={`card flex items-center gap-2 border px-4 py-3 text-sm shadow-card animate-fade-up ${COLORS[i.type]}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-gray-100">{i.message}</span>
          </div>
        );
      })}
    </div>
  );
}
