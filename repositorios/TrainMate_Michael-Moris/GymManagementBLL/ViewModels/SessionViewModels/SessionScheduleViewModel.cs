namespace GymManagementBLL.ViewModels.SessionViewModels
{
    public class SessionScheduleViewModel
    {
        public IEnumerable<SessionViewModel> UpcomingSessions { get; set; } = new List<SessionViewModel>();
        public IEnumerable<SessionViewModel> OngoingSessions { get; set; } = new List<SessionViewModel>();
    }
}
