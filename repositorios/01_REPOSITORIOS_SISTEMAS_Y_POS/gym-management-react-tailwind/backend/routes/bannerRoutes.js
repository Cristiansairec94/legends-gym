module.exports = require('./_crudRouter')({
  table: 'banners',
  columns: ['title','subtitle','image_url','link_url','position','is_active','sort_order'],
  orderBy: 'sort_order ASC, created_at DESC',
  searchable: ['title'],
  filters: { position: 'position', is_active: 'is_active' },
});
