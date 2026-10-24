using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Interfaces
{
    public interface IUnitOfWork
    {
        public ISessionRepository SessionRepository { get; }
        public IMemberSessionRepository MemberSessionRepository { get; }
        IGenericRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity, new();
        public void AttachEntity<TEntity>(TEntity entity) where TEntity : class;
        int SaveChanges();
    }
}
