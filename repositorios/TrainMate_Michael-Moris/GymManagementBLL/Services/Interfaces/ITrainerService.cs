using GymManagementBLL.ViewModels.TrainerViewModels;

namespace GymManagementBLL.Services.Interfaces
{
    public interface ITrainerService
    {
        IEnumerable<TrainerViewModel> GetAllTrainers();
        bool CreateTrainer(CreateTrainerViewModel createTrainer);
        TrainerViewModel? GetTrainerDetails(int trainerId);

        TrainerToUpdateViewModel? GetTrainerToUpdate(int trainer);
        bool UpdateTrainerDetails(TrainerToUpdateViewModel updateTrainer, int trainerId);
        bool RemoveTrainer(int trainerId);
    }
}
