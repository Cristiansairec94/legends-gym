using GymManagementBLL.ViewModels.AccountViewModels;
using GymManagementDAL.Entities;

namespace GymManagementBLL.Services.Interfaces
{
    public interface IAccountService
    {
        ApplicationUser? ValidateUser(LoginViewModel loginViewModel);
    }
}
