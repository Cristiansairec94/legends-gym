using AutoMapper;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberSessionViewModels;
using GymManagementBLL.ViewModels.SessionViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementBLL.Services.Classes
{
    public class MemberSessionService : IMemberSessionService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        public MemberSessionService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public SessionScheduleViewModel GetSessionsForBookingAndAttendance()
        {
            var all = _unitOfWork.SessionRepository.GetAllSessionsWithTrainerAndCategory();

            var upcoming = all.Where(s => s.StartDate > DateTime.Now).ToList();
            var ongoing = all.Where(s => s.StartDate <= DateTime.Now && s.EndDate > DateTime.Now).ToList();

            var upcomingVm = _mapper.Map<IEnumerable<SessionViewModel>>(upcoming).ToList();
            var ongoingVm = _mapper.Map<IEnumerable<SessionViewModel>>(ongoing).ToList();

            foreach (var s in upcomingVm.Concat(ongoingVm))
            {
                var booked = _unitOfWork.MemberSessionRepository.GetAll(x => x.SessionId == s.Id).Count();
                s.AvailableSlots = Math.Max(s.Capacity - booked, 0);
            }

            return new SessionScheduleViewModel
            {
                UpcomingSessions = upcomingVm,
                OngoingSessions = ongoingVm
            };
        }

        public IEnumerable<MemberSessionViewModel> GetMembersForSession(int sessionId)
        {
            var rows = _unitOfWork.MemberSessionRepository.GetBySessionWithMembers(sessionId);
            return _mapper.Map<IEnumerable<MemberSessionViewModel>>(rows);
        }

        public bool CreateBooking(int sessionId, int memberId)
        {
            var session = _unitOfWork.SessionRepository.GetById(sessionId);
            if (session == null || session.StartDate < DateTime.Now)
                return false;

            var member = _unitOfWork.GetRepository<Member>().GetById(memberId);
            if (member == null)
                return false;

            var exists = _unitOfWork.MemberSessionRepository
                .GetAll(x => x.MemberId == memberId && x.SessionId == sessionId)
                .Any();

            if (exists)
                return false;

            var bookedCount = _unitOfWork.MemberSessionRepository
                .GetAll(x => x.SessionId == sessionId).Count();

            if (bookedCount >= session.Capacity)
                return false;

            var entity = new MemberSession
            {
                MemberId = memberId,
                SessionId = sessionId,
                CreatedAt = DateTime.Now
            };

            _unitOfWork.MemberSessionRepository.Add(entity);
            return _unitOfWork.SaveChanges() > 0;
        }

        public bool CancelBooking(int memberId, int sessionId)
        {
            var booking = _unitOfWork.MemberSessionRepository
                .GetAll(x => x.MemberId == memberId && x.SessionId == sessionId)
                .FirstOrDefault();

            if (booking == null) return false;
            _unitOfWork.MemberSessionRepository.Delete(booking);
            return _unitOfWork.SaveChanges() > 0;
        }

        public bool MarkAttended(int memberId, int sessionId)
        {
            var booking = _unitOfWork.MemberSessionRepository
                .GetAll(x => x.MemberId == memberId && x.SessionId == sessionId)
                .FirstOrDefault();

            if (booking == null) return false;
            booking.IsAttended = true;
            _unitOfWork.MemberSessionRepository.Update(booking);
            return _unitOfWork.SaveChanges() > 0;
        }
    }
}
