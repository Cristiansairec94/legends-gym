using AutoMapper;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.SessionViewModels;
using GymManagementBLL.ViewModels.TrainerViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using GymManagementSystemBLL.ViewModels.SessionViewModels;

namespace GymManagementBLL.Services.Classes
{
    public class SessionService : ISessionService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public SessionService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public bool CreateSession(CreateSessionViewModel createSession)
        {
            try
            {
                if (!IsTrainerExists(createSession.TrainerId) ||
                !IsCategoryExists(createSession.CategoryId) ||
                !IsDateTimeValid(createSession.StartDate, createSession.EndDate))
                    return false;

                if (createSession.Capacity > 25 || createSession.Capacity < 0) return false;

                var SessionEntity = _mapper.Map<Session>(createSession);
                _unitOfWork.GetRepository<Session>().Add(SessionEntity);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Create Session Failed!.. {ex}");
                return false;
            }
        }

        public IEnumerable<SessionViewModel> GetAllSessions()
        {
            var Sessions = _unitOfWork.SessionRepository.GetAllSessionsWithTrainerAndCategory();
            if (!Sessions.Any()) return [];

            #region Manual Mapping
            //return Sessions.Select(s => new SessionViewModel
            //{
            //    Id = s.Id,
            //    Description = s.Description,
            //    StartDate = s.StartDate,
            //    EndDate = s.EndDate,
            //    Capacity = s.Capacity,
            //    TrainerName = s.SessionTrainer.Name,
            //    CategoryName = s.SessionCategory.CategoryName,
            //    AvailableSlots = s.Capacity - _unitOfWork.SessionRepository.GetCountOfBookedSlots(s.Id)
            //}); 
            #endregion

            var MappedSessions = _mapper.Map<IEnumerable<Session>, IEnumerable<SessionViewModel>>(Sessions);
            foreach (var session in MappedSessions)
                session.AvailableSlots = session.Capacity - _unitOfWork.SessionRepository.GetCountOfBookedSlots(session.Id);
            return MappedSessions;
        }

        public SessionViewModel? GetSessionById(int sessionId)
        {
            var Session = _unitOfWork.SessionRepository.GetSessionWithTrainerAndCategoryById(sessionId);
            if (Session is null) return null;

            #region Manual Mapping
            //return new SessionViewModel
            //{
            //    Id = Session.Id,
            //    Description = Session.Description,
            //    StartDate = Session.StartDate,
            //    EndDate = Session.EndDate,
            //    Capacity = Session.Capacity,
            //    TrainerName = Session.SessionTrainer.Name,
            //    CategoryName = Session.SessionCategory.CategoryName,
            //    AvailableSlots = Session.Capacity - _unitOfWork.SessionRepository.GetCountOfBookedSlots(Session.Id)
            //}; 
            #endregion

            var MappedSession = _mapper.Map<Session, SessionViewModel>(Session);
            MappedSession.AvailableSlots = MappedSession.Capacity - _unitOfWork.SessionRepository.GetCountOfBookedSlots(MappedSession.Id);
            return MappedSession;
        }

        public UpdateSessionViewModel? GetSessionToUpdate(int sessionId)
        {
            var Session = _unitOfWork.SessionRepository.GetById(sessionId);
            if (!IsSessionAvailableForUpdate(Session!)) return null;
            return _mapper.Map<UpdateSessionViewModel>(Session);
        }

        public bool UpdateSession(UpdateSessionViewModel updateSession, int sessionId)
        {
            try
            {
                var Session = _unitOfWork.SessionRepository.GetById(sessionId);
                if (!IsSessionAvailableForUpdate(Session!) ||
                    !IsTrainerExists(updateSession.TrainerId) ||
                    !IsDateTimeValid(updateSession.StartDate, updateSession.EndDate))
                    return false;

                _mapper.Map(updateSession, Session);
                Session!.Updated = DateTime.Now;
                _unitOfWork.SessionRepository.Update(Session);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Update Session Failed!.. {ex}");
                return false;
            }
        }

        public bool RemoveSession(int sessionId)
        {
            try
            {
                var Session = _unitOfWork.SessionRepository.GetById(sessionId);
                if (!IsSessionAvailableForRemove(Session!)) return false;
                _unitOfWork.SessionRepository.Delete(Session!);
                return _unitOfWork.SaveChanges() > 0;

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Delete Session Failed!.. {ex}");
                return false;
            }
        }

        public IEnumerable<TrainerSelectViewModel> GetTrainersForDropDown()
        {
            var Trainers = _unitOfWork.GetRepository<Trainer>().GetAll();
            return _mapper.Map<IEnumerable<TrainerSelectViewModel>>(Trainers);
        }

        public IEnumerable<CategorySelectViewModel> GetCategoryForDropDown()
        {
            var Categories = _unitOfWork.GetRepository<Category>().GetAll();
            return _mapper.Map<IEnumerable<CategorySelectViewModel>>(Categories);
        }

        #region Helper Methods
        private bool IsTrainerExists(int trainerId)
        {
            return _unitOfWork.GetRepository<Trainer>().GetById(trainerId) is not null;
        }

        private bool IsCategoryExists(int categoryId)
        {
            return _unitOfWork.GetRepository<Category>().GetById(categoryId) is not null;
        }

        private bool IsDateTimeValid(DateTime startDate, DateTime endDate)
        {
            return endDate > startDate && DateTime.Now < startDate;
        }

        private bool IsSessionAvailableForUpdate(Session session)
        {
            return session.StartDate > DateTime.Now &&
                _unitOfWork.SessionRepository.GetCountOfBookedSlots(session.Id) == 0;
        }

        private bool IsSessionAvailableForRemove(Session session)
        {
            if (session is null) return false;
            if (session.StartDate <= DateTime.Now && session.EndDate > DateTime.Now) return false;
            if (session.StartDate > DateTime.Now) return false;

            var HasActiveBookings = _unitOfWork.SessionRepository.GetCountOfBookedSlots(session.Id) > 0;
            if (HasActiveBookings) return false;

            return true;
        }
        #endregion
    }
}
