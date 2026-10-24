import { useEffect, useState } from 'react';
import { contentService } from '../services/adminService';

let cache = null;
const subs = new Set();

export function useContent() {
  const [content, setContent] = useState(cache || {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const update = (c) => setContent({ ...c });
    subs.add(update);
    if (!cache) {
      contentService.get()
        .then((res) => { cache = res.data; subs.forEach((s) => s(cache)); })
        .catch(() => { cache = {}; })
        .finally(() => setLoading(false));
    }
    return () => subs.delete(update);
  }, []);

  return { content, loading };
}
