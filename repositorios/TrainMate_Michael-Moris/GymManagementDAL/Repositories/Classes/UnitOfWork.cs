using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Classes
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly Dictionary<Type, object> _repositories = new();
        private readonly GymDbContext _dbContext;

        public UnitOfWork(GymDbContext dbContext, ISessionRepository sessionRepository, IMemberSessionRepository memberSessionRepository)
        {
            _dbContext = dbContext;
            SessionRepository = sessionRepository;
            MemberSessionRepository = memberSessionRepository;

        }

        public ISessionRepository SessionRepository { get; }
        public IMemberSessionRepository MemberSessionRepository { get; }
        public IGenericRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity, new()
        {
            var EntityType = typeof(TEntity);
            if (_repositories.TryGetValue(EntityType, out var Repo))
                return (IGenericRepository<TEntity>)Repo;

            var NewRepo = new GenericRepository<TEntity>(_dbContext);
            _repositories[EntityType] = NewRepo;
            return NewRepo;
        }
        public void AttachEntity<TEntity>(TEntity entity) where TEntity : class
        {
            var entry = _dbContext.Entry(entity);
            if (entry.State == EntityState.Detached)
                _dbContext.Attach(entity);
        }
        public int SaveChanges()
        {
            return _dbContext.SaveChanges();
        }
    }
}
