export const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const daysBetween = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);

export const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Normalize a user-entered social/website URL so it opens the real site.
// Handles: empty -> null, "@handle" (returns null, no domain), missing scheme -> prepend https://
export const externalUrl = (raw) => {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v || v === '#' || v.startsWith('@')) return null;
  if (/^https?:\/\//i.test(v)) return v;      // already has scheme
  if (v.startsWith('//')) return `https:${v}`;
  return `https://${v}`;                        // e.g. "instagram.com/user" -> "https://instagram.com/user"
};
