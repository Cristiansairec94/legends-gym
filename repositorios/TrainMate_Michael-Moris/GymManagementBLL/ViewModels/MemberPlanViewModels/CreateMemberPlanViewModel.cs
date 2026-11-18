using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.ViewModels.MemberPlanViewModels
{
    public class CreateMemberPlanViewModel
    {
        [Required]
        public int MemberId { get; set; }

        [Required]
        public int PlanId { get; set; }
    }
}
