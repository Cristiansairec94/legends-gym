namespace GymManagementBLL.ViewModels.MemberPlanViewModels
{
    public class MemberPlanViewModel
    {
        public int MemberId { get; set; }
        public int PlanId { get; set; }
        public string MemberName { get; set; } = null!;
        public string PlanName { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime EndDate { get; set; }
        public string Status => EndDate <= DateTime.Now ? "Expired" : "Active";
    }
}
