module.exports = require('./_crudRouter')({
  table: 'services',
  columns: ['title','description','icon','is_active'],
  orderBy: 'id ASC',
  searchable: ['title'],
  filters: { is_active: 'is_active' },
});
