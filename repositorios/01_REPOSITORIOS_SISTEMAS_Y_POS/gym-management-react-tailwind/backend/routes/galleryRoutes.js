module.exports = require('./_crudRouter')({
  table: 'gallery_images',
  columns: ['title','category','image_url','is_active'],
  orderBy: 'created_at DESC',
  searchable: ['title','category'],
  filters: { category: 'category', is_active: 'is_active' },
});
