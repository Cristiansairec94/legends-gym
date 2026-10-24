using AutoMapper;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.PlanViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementBLL.Services.Classes
{
    public class PlanService : IPlanService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public PlanService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public IEnumerable<PlanViewModel> GetAllPlans()
        {
            var Plans = _unitOfWork.GetRepository<Plan>().GetAll();
            if (Plans is null || !Plans.Any()) return [];

            return _mapper.Map<IEnumerable<PlanViewModel>>(Plans);
        }

        public PlanViewModel? GetPlanById(int id)
        {
            var Plan = _unitOfWork.GetRepository<Plan>().GetById(id);
            if (Plan is null) return null;
            return _mapper.Map<PlanViewModel>(Plan);
        }

        public UpdatePLanViewModel? GetPlanToUpdate(int PlanId)
        {
            var Plan = _unitOfWork.GetRepository<Plan>().GetById(PlanId);
            if (Plan is null || Plan.IsActive == false || HasActiveMmberships(PlanId)) return null;
            return _mapper.Map<UpdatePLanViewModel>(Plan);
        }

        public bool UpdatePlan(int planId, UpdatePLanViewModel updatePlan)
        {
            var PLan = _unitOfWork.GetRepository<Plan>().GetById(planId);
            if (PLan is null || HasActiveMmberships(planId)) return false;

            try
            {
                _mapper.Map(updatePlan, PLan);
                _unitOfWork.GetRepository<Plan>().Update(PLan);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }

        public bool TogglePlanStatus(int planId)
        {
            var Repo = _unitOfWork.GetRepository<Plan>();
            var Plan = Repo.GetById(planId);
            if (Plan is null || HasActiveMmberships(planId)) return false;

            Plan.IsActive = Plan.IsActive == true ? false : true;
            Plan.Updated = DateTime.Now;

            try
            {
                Repo.Update(Plan);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }

        #region Helper
        private bool HasActiveMmberships(int planId)
        {
            var ActiveMemerships = _unitOfWork.GetRepository<MemberShip>()
                .GetAll(X => X.PlanId == planId && X.Status == "Active");
            return ActiveMemerships.Any();
        }
        #endregion
    }
}
