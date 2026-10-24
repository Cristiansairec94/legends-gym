using GymManagementBLL.ViewModels.PlanViewModels;

namespace GymManagementBLL.Services.Interfaces
{
    public interface IPlanService
    {
        IEnumerable<PlanViewModel> GetAllPlans();
        PlanViewModel? GetPlanById(int id);
        UpdatePLanViewModel? GetPlanToUpdate(int id);
        bool UpdatePlan(int planId, UpdatePLanViewModel updatePlan);
        bool TogglePlanStatus(int planId);
    }
}
