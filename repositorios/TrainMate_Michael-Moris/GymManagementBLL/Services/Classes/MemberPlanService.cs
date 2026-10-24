using AutoMapper;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberPlanViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementBLL.Services.Classes
{
    public class MemberPlanService : IMemberPlanService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public MemberPlanService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public IEnumerable<MemberPlanViewModel> GetAllMemberShips()
        {
            var MemberShips = _unitOfWork.GetRepository<MemberShip>().GetAll();
            if (MemberShips is null || !MemberShips.Any()) return [];
            foreach (var ms in MemberShips)
            {
                ms.Member = _unitOfWork.GetRepository<Member>().GetById(ms.MemberId)!;
                ms.Plan = _unitOfWork.GetRepository<Plan>().GetById(ms.PlanId)!;
            }
            return _mapper.Map<IEnumerable<MemberPlanViewModel>>(MemberShips);
        }

        public bool CreateMembership(CreateMemberPlanViewModel CreatedMPmodel)
        {
            try
            {
                var member = _unitOfWork.GetRepository<Member>().GetById(CreatedMPmodel.MemberId);
                if (member is null) return false;

                var plan = _unitOfWork.GetRepository<Plan>().GetById(CreatedMPmodel.PlanId);
                if (plan is null || !plan.IsActive) return false;

                var hasActive = _unitOfWork.GetRepository<MemberShip>()
                    .GetAll(x => x.MemberId == CreatedMPmodel.MemberId && x.EndDate > DateTime.Now)
                    .Any();
                if (hasActive) return false;

                var entity = new MemberShip
                {
                    MemberId = CreatedMPmodel.MemberId,
                    PlanId = CreatedMPmodel.PlanId,
                    CreatedAt = DateTime.Now,
                    EndDate = DateTime.Now.AddDays(plan.DurationDays)
                };

                _unitOfWork.GetRepository<MemberShip>().Add(entity);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }

        public bool CancelMembership(int memberId, int planId)
        {
            try
            {
                var repo = _unitOfWork.GetRepository<MemberShip>();
                var membership = repo.GetAll(x => x.MemberId == memberId && x.PlanId == planId)
                             .FirstOrDefault();
                if (membership is null) return false;
                if (membership.EndDate.Date <= DateTime.Now.Date) return false;

                repo.Delete(membership);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }
    }
}
