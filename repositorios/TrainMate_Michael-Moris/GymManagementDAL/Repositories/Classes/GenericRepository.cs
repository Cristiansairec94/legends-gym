using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Classes
{
    public class GenericRepository<TEntity> : IGenericRepository<TEntity> where TEntity : BaseEntity, new()
    {
        private readonly GymDbContext _dbContext;

        public GenericRepository(GymDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public void Add(TEntity entity) => _dbContext.Set<TEntity>().Add(entity);

        public void Delete(TEntity entity) => _dbContext.Set<TEntity>().Remove(entity);

        public IEnumerable<TEntity> GetAll(Func<TEntity, bool>? condition = null, string? includeProperties = null)
        {
            IQueryable<TEntity> query = _dbContext.Set<TEntity>();
            if (!string.IsNullOrWhiteSpace(includeProperties))
            {
                foreach (var includeProperty in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries))
                {
                    query = query.Include(includeProperty);
                }
            }

            var result = query.AsNoTracking().ToList();
            if (condition is not null)
                result = result.Where(condition).ToList();

            return result;
        }

        public TEntity? GetById(int id) => _dbContext.Set<TEntity>().Find(id);

        public void Update(TEntity entity) => _dbContext.Set<TEntity>().Update(entity);

        public bool Exists(Func<TEntity, bool> predicate)
        {
            return _dbContext.Set<TEntity>().Any(predicate);
        }
    }
}
