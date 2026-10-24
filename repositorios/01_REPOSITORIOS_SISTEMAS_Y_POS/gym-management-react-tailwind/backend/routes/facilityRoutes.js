module.exports = require('./_crudRouter')({
  table: 'facilities',
  columns: ['title','description','icon','image_url','is_active'],
  orderBy: 'id ASC',
  searchable: ['title'],
  filters: { is_active: 'is_active' },
});
