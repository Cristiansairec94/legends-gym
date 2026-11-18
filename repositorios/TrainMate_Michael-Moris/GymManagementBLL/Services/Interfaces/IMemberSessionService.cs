using GymManagementBLL.ViewModels.MemberSessionViewModels;
using GymManagementBLL.ViewModels.SessionViewModels;

namespace GymManagementBLL.Services.Interfaces
{
    public interface IMemberSessionService
    {
        SessionScheduleViewModel GetSessionsForBookingAndAttendance();
        IEnumerable<MemberSessionViewModel> GetMembersForSession(int sessionId);
        bool CreateBooking(int sessionId, int memberId);
        bool CancelBooking(int memberId, int sessionId);
        bool MarkAttended(int memberId, int sessionId);
    }
}
