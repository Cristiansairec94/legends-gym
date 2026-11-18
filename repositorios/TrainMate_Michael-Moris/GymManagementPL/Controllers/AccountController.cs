using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.AccountViewModels;
using GymManagementDAL.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    public class AccountController : Controller
    {
        private readonly IAccountService _accountService;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public AccountController(IAccountService accountService, SignInManager<ApplicationUser> signInManager)
        {
            _accountService = accountService;
            _signInManager = signInManager;
        }

        #region Login
        public ActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public ActionResult Login(LoginViewModel Model)
        {
            if (!ModelState.IsValid) return View(Model);

            var User = _accountService.ValidateUser(Model);
            if (User is null)
            {
                ModelState.AddModelError("InvalidLogin", "Invalid Email Or Password");
                return View(Model);
            }

            var Result = _signInManager.PasswordSignInAsync(User, Model.Password, Model.RememberMe, false).Result;
            if (Result.IsNotAllowed)
                ModelState.AddModelError("InvalidLogin", "Your Account Is Not Allowed");
            if (Result.IsLockedOut)
                ModelState.AddModelError("InvalidLogin", "Your Account Is Locked Out");
            if (Result.Succeeded)
                return RedirectToAction("Index", "Home");
            return View(Model);


        }
        #endregion

        #region LogOut
        [HttpPost]
        public ActionResult Logout()
        {
            _signInManager.SignOutAsync().GetAwaiter().GetResult();
            return RedirectToAction(nameof(Login));
        }
        #endregion

        #region AccessDenied
        public ActionResult AccessDenied()
        {
            return View();
        }
        #endregion
    }
}
