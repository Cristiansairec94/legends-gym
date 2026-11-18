using AutoMapper;
using AutoMapper.Execution;
using GymManagementBLL.Services.AttachmentService;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementBLL.Services.Classes
{
    public class MemberService : IMemberService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IAttachmentService _attachmentService;

        //Ask CLR for creating object from service
        // CLR will inject address of object in Constructor
        public MemberService(IUnitOfWork unitOfWork, IMapper mapper, IAttachmentService attachmentService)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _attachmentService = attachmentService;
        }

        public bool CreateMember(CreateMemberViewModel createMember)
        {
            try
            {
                if (IsEmailExists(createMember.Email) || IsPhoneExists(createMember.Phone)) return false;

                string? photo = null;
                if (createMember.PhotoFile != null)
                    photo = _attachmentService.Upload("members", createMember.PhotoFile);

                var entity = _mapper.Map<GymManagementDAL.Entities.Member>(createMember);
                entity.Photo = !string.IsNullOrEmpty(photo) ? photo : "User.jpg";


                _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().Add(entity);
                var ok = _unitOfWork.SaveChanges() > 0;

                if (!ok && photo != null)
                    _attachmentService.Delete(photo, "members");
                return ok;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public IEnumerable<MemberViewModel> GetAllMembers()
        {
            var Members = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().GetAll();
            if (Members is null || !Members.Any()) return [];
            var MemberViewModels = _mapper.Map<IEnumerable<MemberViewModel>>(Members);
            return MemberViewModels;
        }

        public MemberViewModel? GetMemberDetails(int MemberId)
        {
            var Member = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().GetById(MemberId);
            if (Member is null) return null;

            var ViewModel = _mapper.Map<MemberViewModel>(Member);
            var ActiveMembership = _unitOfWork.GetRepository<MemberShip>().GetAll(X => X.MemberId == MemberId && X.Status == "Active")
                                                        .FirstOrDefault();
            if (ActiveMembership is not null)
            {
                ViewModel.MembershipStartDate = ActiveMembership.CreatedAt.ToShortDateString();
                ViewModel.MembershipEndDate = ActiveMembership.EndDate.ToShortDateString();
                var Plan = _unitOfWork.GetRepository<Plan>().GetById(ActiveMembership.PlanId);
                ViewModel.PlanName = Plan?.Name;
            }
            return ViewModel;
        }

        public HealthRecordViewModel? GetMemberHealthRecordDetails(int MemberId)
        {
            var MemberHealthRecord = _unitOfWork.GetRepository<HealthRecord>().GetById(MemberId);
            if (MemberHealthRecord is null) return null;
            return _mapper.Map<HealthRecordViewModel>(MemberHealthRecord);
        }

        public MemberToUpdateViewModel? GetMemberToUpdate(int MemberId)
        {
            var Member = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().GetById(MemberId);
            if (Member is null) return null;
            return _mapper.Map<MemberToUpdateViewModel>(Member);
        }

        public bool RemoveMember(int MemberId)
        {
            var MemberRepo = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>();

            var Member = MemberRepo.GetById(MemberId);
            if (Member is null) return false;

            var SessionIds = _unitOfWork.GetRepository<MemberSession>()
                .GetAll(X => X.MemberId == MemberId).Select(X => X.SessionId);

            var HasFutureSessions = _unitOfWork.GetRepository<Session>()
                .GetAll(X => SessionIds.Contains(X.Id) && X.StartDate > DateTime.Now).Any();

            if (HasFutureSessions) return false;

            var MembershipRepo = _unitOfWork.GetRepository<MemberShip>();
            var Memberships = MembershipRepo.GetAll(X => X.MemberId == MemberId);
            try
            {
                if (Memberships.Any())
                {
                    foreach (var membership in Memberships)
                    {
                        MembershipRepo.Delete(membership);
                    }
                }
                MemberRepo.Delete(Member);
                var IsDeleted = _unitOfWork.SaveChanges() > 0;
                if (IsDeleted && !string.IsNullOrEmpty(Member.Photo))
                    _attachmentService.Delete(Member.Photo, "members");
                return IsDeleted;
            }
            catch
            {
                return false;
            }
        }

        public bool UpdateMemberDetails(int Id, MemberToUpdateViewModel updateMember)
        {
            try
            {
                var emailExists = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>()
                    .GetAll(X => X.Email == updateMember.Email && X.Id != Id);

                var phoneExists = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>()
                    .GetAll(X => X.PhoneNumber == updateMember.Phone && X.Id != Id);

                if (emailExists.Any() || phoneExists.Any()) return false;

                var Repo = _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>();
                var Member = Repo.GetById(Id);
                if (Member is null) return false;
                _mapper.Map(updateMember, Member);
                Repo.Update(Member);
                return _unitOfWork.SaveChanges() > 0;

            }
            catch (Exception)
            {
                return false;
            }
        }

        #region Helper Methods
        private bool IsEmailExists(string email)
        {
            return _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().GetAll(X => X.Email == email).Any();
        }

        private bool IsPhoneExists(string phone)
        {
            return _unitOfWork.GetRepository<GymManagementDAL.Entities.Member>().GetAll(X => X.PhoneNumber == phone).Any();
        }
        #endregion
    }
}
