module.exports = require('./_crudRouter')({
  table: 'product_categories',
  columns: ['name','slug','is_active'],
  orderBy: 'name ASC',
  searchable: ['name'],
  filters: { is_active: 'is_active' },
});
