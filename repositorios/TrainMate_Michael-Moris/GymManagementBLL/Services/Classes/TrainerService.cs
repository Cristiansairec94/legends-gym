using AutoMapper;
using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.TrainerViewModels;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementBLL.Services.Classes
{
    public class TrainerService : ITrainerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TrainerService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public bool CreateTrainer(CreateTrainerViewModel createTrainer)
        {
            try
            {
                var Repo = _unitOfWork.GetRepository<Trainer>();

                if (IsEmailExists(createTrainer.Email) || IsPhoneExists(createTrainer.Phone)) return false;
                var trainer = _mapper.Map<Trainer>(createTrainer);
                Repo.Add(trainer);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public IEnumerable<TrainerViewModel> GetAllTrainers()
        {
            var Trainers = _unitOfWork.GetRepository<Trainer>().GetAll();
            if (Trainers is null || !Trainers.Any()) return [];
            return _mapper.Map<IEnumerable<TrainerViewModel>>(Trainers);
        }

        public TrainerViewModel? GetTrainerDetails(int trainerId)
        {
            var Trainer = _unitOfWork.GetRepository<Trainer>().GetById(trainerId);
            if (Trainer is null) return null;
            return _mapper.Map<TrainerViewModel>(Trainer);
        }

        public TrainerToUpdateViewModel? GetTrainerToUpdate(int trainer)
        {
            var Trainer = _unitOfWork.GetRepository<Trainer>().GetById(trainer);
            if (Trainer is null) return null;
            return _mapper.Map<TrainerToUpdateViewModel>(Trainer);
        }

        public bool RemoveTrainer(int trainerId)
        {
            var Repo = _unitOfWork.GetRepository<Trainer>();
            var TrainerToRemove = Repo.GetById(trainerId);
            if (TrainerToRemove is null || HasActiveSessions(trainerId)) return false;
            Repo.Delete(TrainerToRemove);
            return _unitOfWork.SaveChanges() > 0;
        }

        public bool UpdateTrainerDetails(TrainerToUpdateViewModel updateTrainer, int trainerId)
        {
            var Repo = _unitOfWork.GetRepository<Trainer>();
            var TrainerToUpdate = Repo.GetById(trainerId);
            if (TrainerToUpdate is null || IsEmailExists(updateTrainer.Email) || IsPhoneExists(updateTrainer.Phone)) return false;

            _mapper.Map(updateTrainer, TrainerToUpdate);
            Repo.Update(TrainerToUpdate);
            return _unitOfWork.SaveChanges() > 0;
        }

        #region Helper
        private bool IsEmailExists(string email)
        {
            var existing = _unitOfWork.GetRepository<Member>()
                .GetAll(X => X.Email == email).Any();
            return existing;
        }
        private bool IsPhoneExists(string phone)
        {
            var existing = _unitOfWork.GetRepository<Member>()
                .GetAll(X => X.PhoneNumber == phone).Any();
            return existing;
        }
        private bool HasActiveSessions(int trainerId)
        {
            var hasSessions = _unitOfWork.GetRepository<Session>()
                .GetAll(X => X.TrainerId == trainerId && X.StartDate > DateTime.Now).Any();
            return hasSessions;
        }
        #endregion
    }
}
