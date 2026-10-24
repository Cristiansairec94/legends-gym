using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Classes
{
    public class MemberSessionRepository : GenericRepository<MemberSession>, IMemberSessionRepository
    {
        private readonly GymDbContext _dbContext;
        public MemberSessionRepository(GymDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public IEnumerable<MemberSession> GetBySessionWithMembers(int sessionId)
        {
            return _dbContext.MemberSessions
                   .Include(x => x.Member)
                   .Where(x => x.SessionId == sessionId)
                   .ToList();
        }
    }
}
