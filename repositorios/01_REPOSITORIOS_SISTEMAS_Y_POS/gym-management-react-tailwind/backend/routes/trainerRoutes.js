module.exports = require('./_crudRouter')({
  table: 'trainers',
  columns: ['name','role','specialization','experience_years','bio','certifications','photo_url','facebook_url','instagram_url','availability','is_active'],
  orderBy: 'created_at DESC',
  searchable: ['name','specialization','role'],
  filters: { is_active: 'is_active' },
});
