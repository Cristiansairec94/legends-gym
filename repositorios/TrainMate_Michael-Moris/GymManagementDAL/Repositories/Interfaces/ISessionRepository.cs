using GymManagementDAL.Entities;

namespace GymManagementDAL.Repositories.Interfaces
{
    public interface ISessionRepository : IGenericRepository<Session>
    {
        IEnumerable<Session> GetAllSessionsWithTrainerAndCategory();
        int GetCountOfBookedSlots(int sessionId);
        Session? GetSessionWithTrainerAndCategoryById(int sessionId);
    }
}
