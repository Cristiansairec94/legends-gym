using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Classes
{
    public class SessionRepository : GenericRepository<Session>, ISessionRepository
    {
        private readonly GymDbContext _dbContext;

        public SessionRepository(GymDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }
        public IEnumerable<Session> GetAllSessionsWithTrainerAndCategory()
        {
            return _dbContext.Sessions.Include(X => X.SessionTrainer)
                                      .Include(X => X.SessionCategory)
                                      .ToList();
        }

        public int GetCountOfBookedSlots(int sessionId)
        {
            return _dbContext.MemberSessions.Count(ms => ms.SessionId == sessionId);
        }

        public Session? GetSessionWithTrainerAndCategoryById(int sessionId)
        {
            return _dbContext.Sessions
                             .Include(s => s.SessionTrainer)
                             .Include(s => s.SessionCategory)
                             .FirstOrDefault(s => s.Id == sessionId);
        }
    }
}
