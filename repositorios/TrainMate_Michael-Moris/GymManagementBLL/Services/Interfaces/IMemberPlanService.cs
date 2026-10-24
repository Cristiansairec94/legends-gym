using GymManagementBLL.ViewModels.MemberPlanViewModels;

namespace GymManagementBLL.Services.Interfaces
{
    public interface IMemberPlanService
    {
        IEnumerable<MemberPlanViewModel> GetAllMemberShips();
        bool CreateMembership(CreateMemberPlanViewModel CreatedMPmodel);
        bool CancelMembership(int memberId, int planId);
    }
}
