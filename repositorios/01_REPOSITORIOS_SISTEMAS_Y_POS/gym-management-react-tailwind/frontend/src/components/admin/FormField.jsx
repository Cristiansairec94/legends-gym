/**
 * Renders one field of an admin form from a config object.
 * field: { name, label, type, options?, placeholder?, required?, help?, colSpan? }
 * types: text | email | number | date | time | textarea | select | checkbox | tags
 */
export default function FormField({ field, value, onChange }) {
  const { name, label, type = 'text', options = [], placeholder, required, help } = field;

  const base = 'input';

  const render = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            className={`${base} min-h-[90px]`}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(name, e.target.value)}
          />
        );

      case 'select':
        return (
          <select className={base} value={value ?? ''} onChange={(e) => onChange(name, e.target.value)}>
            <option value="">— Select —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={!!value}
              onChange={(e) => onChange(name, e.target.checked)}
            />
            <span className="text-sm text-gray-300">{placeholder || 'Enabled'}</span>
          </label>
        );

      case 'tags':
        // comma-separated editor -> array of trimmed strings
        return (
          <textarea
            className={`${base} min-h-[70px]`}
            value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
            placeholder={placeholder || 'Feature one, Feature two, Feature three'}
            onChange={(e) =>
              onChange(name, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
            }
          />
        );

      default:
        return (
          <input
            type={type}
            className={base}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(name, e.target.value)}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return <div>{render()}</div>;
  }

  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      {render()}
      {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
    </div>
  );
}
