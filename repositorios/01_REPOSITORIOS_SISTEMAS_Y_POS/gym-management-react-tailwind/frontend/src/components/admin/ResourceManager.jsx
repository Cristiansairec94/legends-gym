import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeading from './PageHeading';
import DataTable from './DataTable';
import FormField from './FormField';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import { toast } from '../../utils/toast';

/**
 * Full-CRUD admin screen driven by config.
 *
 * props:
 *  - title, subtitle
 *  - service: { list, create, update, remove }
 *  - columns: DataTable columns (id auto-keyed). Actions column added automatically.
 *  - fields: FormField configs for create/edit
 *  - searchable: boolean (adds a search box wired to ?search=)
 *  - filters: [{ name, label, options:[{value,label}] }] -> query params
 *  - defaultValues: object for a fresh create form
 *  - toRow?(record) -> record (optional shaping before table)
 *  - beforeSubmit?(values, isEdit) -> payload
 *  - listParam?: extra static query params
 */
export default function ResourceManager({
  title,
  subtitle,
  service,
  columns,
  fields,
  searchable = true,
  filters = [],
  defaultValues = {},
  beforeSubmit,
  listParams = {},
  createLabel = 'Add New',
}) {
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filterValues, setFilterValues] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultValues);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(
    () => ({ page, limit: 10, ...listParams, ...(debounced ? { search: debounced } : {}), ...filterValues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, debounced, filterValues]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.list(params);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(defaultValues); setModalOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...defaultValues, ...row }); setModalOpen(true); };
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = beforeSubmit ? beforeSubmit(form, !!editing) : form;
      if (editing) {
        await service.update(editing.id, payload);
        toast.success(`${title.replace(/s$/, '')} updated`);
      } else {
        await service.create(payload);
        toast.success(`${title.replace(/s$/, '')} created`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await service.remove(confirm.id);
      toast.success('Record deleted');
      setConfirm(null);
      // if last row on a page was removed, step back a page
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns = [
    ...columns,
    {
      key: '__actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-sky-400"
            onClick={() => openEdit(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {service.remove && (
            <button
              className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-rose-400"
              onClick={() => setConfirm(row)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeading title={title} subtitle={subtitle}>
        {service.create && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {createLabel}
          </button>
        )}
      </PageHeading>

      {(searchable || filters.length > 0) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          {searchable && (
            <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder={`Search ${title.toLowerCase()}…`} />
          )}
          {filters.map((f) => (
            <select
              key={f.name}
              className="input sm:max-w-[180px]"
              value={filterValues[f.name] || ''}
              onChange={(e) => { setFilterValues((v) => ({ ...v, [f.name]: e.target.value })); setPage(1); }}
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      <DataTable
        columns={tableColumns}
        rows={data.items}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ title: `No ${title.toLowerCase()} yet`, subtitle: service.create ? `Use "${createLabel}" to add one.` : undefined }}
      />

      <Pagination
        page={data.pagination?.page || page}
        pages={data.pagination?.pages || 1}
        total={data.pagination?.total}
        onChange={setPage}
      />

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
              <FormField field={f} value={form[f.name]} onChange={setField} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete record?"
        message={`This will permanently remove "${confirm?.name || confirm?.title || confirm?.full_name || 'this record'}". This cannot be undone.`}
      />
    </div>
  );
}
