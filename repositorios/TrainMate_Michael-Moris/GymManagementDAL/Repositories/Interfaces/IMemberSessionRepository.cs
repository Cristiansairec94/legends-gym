using GymManagementDAL.Entities;

namespace GymManagementDAL.Repositories.Interfaces
{
    public interface IMemberSessionRepository : IGenericRepository<MemberSession>
    {
        IEnumerable<MemberSession> GetBySessionWithMembers(int sessionId);
    }
}
