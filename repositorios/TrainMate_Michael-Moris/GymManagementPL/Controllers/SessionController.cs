using GymManagementBLL.Services.Interfaces;
using GymManagementSystemBLL.ViewModels.SessionViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GymManagementPL.Controllers
{
    [Authorize]
    public class SessionController : Controller
    {
        private readonly ISessionService _sessionService;

        public SessionController(ISessionService sessionService)
        {
            _sessionService = sessionService;
        }

        #region Get All Sessions
        public IActionResult Index()
        {
            var Sessions = _sessionService.GetAllSessions();
            return View(Sessions);
        }
        #endregion

        #region Session Details
        public ActionResult Details(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Session Id";
                return RedirectToAction(nameof(Index));
            }
            var Session = _sessionService.GetSessionById(id);
            if (Session is null)
            {
                TempData["ErrorMessage"] = "Session Not Found ";
                return RedirectToAction(nameof(Index));
            }
            return View(Session);
        }
        #endregion

        #region Create Session
        public ActionResult Create()
        {
            LoadDropDownsForCategories();
            LoadDropDownsForTrainers();
            return View();
        }

        [HttpPost]
        public ActionResult Create(CreateSessionViewModel CreatedSession)
        {
            if (!ModelState.IsValid)
            {
                LoadDropDownsForCategories();
                LoadDropDownsForTrainers();
                return View(CreatedSession);
            }
            var Result = _sessionService.CreateSession(CreatedSession);
            if (Result)
            {
                TempData["SuccessMessage"] = "Session Created Successfully";
                return RedirectToAction(nameof(Index));
            }
            else
            {
                TempData["ErrorMessage"] = "Failed To Create Session";
                LoadDropDownsForCategories();
                LoadDropDownsForTrainers();
                return View(CreatedSession);
            }
        }
        #endregion

        #region Edit Session
        public ActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Session Id";
                return RedirectToAction(nameof(Index));
            }
            var Session = _sessionService.GetSessionToUpdate(id);
            if (Session is null)
            {
                TempData["ErrorMessage"] = "Session Can Not Be Updated";
                return RedirectToAction(nameof(Index));
            }
            LoadDropDownsForTrainers();
            return View(Session);
        }

        [HttpPost]
        public ActionResult Edit([FromRoute] int id, UpdateSessionViewModel UpdatedSession)
        {
            if (!ModelState.IsValid)
            {
                LoadDropDownsForTrainers();
                return View(UpdatedSession);
            }
            var Result = _sessionService.UpdateSession(UpdatedSession, id);
            if (Result)
            {
                TempData["SuccessMessage"] = "Session Updated Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Failed To Update Session";
            }
            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Delete Session
        public ActionResult Delete(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Session Id";
                return RedirectToAction(nameof(Index));
            }
            var Session = _sessionService.GetSessionById(id);
            if (Session is null)
            {
                TempData["ErrorMessage"] = "Session Not Found";
                return RedirectToAction(nameof(Index));
            }
            ViewBag.SessionId = Session.Id;
            return View();
        }

        [HttpPost]
        public ActionResult DeleteConfirmed(int id)
        {
            var Result = _sessionService.RemoveSession(id);
            if (Result)
            {
                TempData["SuccessMessage"] = "Session Deleted Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Session Can Not Be Deleted";
            }
            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Helper Methods
        private void LoadDropDownsForCategories()
        {
            var Categories = _sessionService.GetCategoryForDropDown();
            ViewBag.Categories = new SelectList(Categories, "Id", "Name");
        }

        private void LoadDropDownsForTrainers()
        {
            var Trainers = _sessionService.GetTrainersForDropDown();
            ViewBag.Trainers = new SelectList(Trainers, "Id", "Name");
        }
        #endregion
    }
}
