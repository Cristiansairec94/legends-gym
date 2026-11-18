using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.PlanViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    [Authorize]
    public class PLanController : Controller
    {
        private readonly IPlanService _planService;

        public PLanController(IPlanService planService)
        {
            _planService = planService;
        }

        #region Get All Plans
        public IActionResult Index()
        {
            var Plans = _planService.GetAllPlans();
            return View(Plans);
        }
        #endregion

        #region Plan Details
        public ActionResult Details(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Inavild Id";
                return RedirectToAction(nameof(Index));
            }

            var PLan = _planService.GetPlanById(id);
            if (PLan is null)
            {
                TempData["ErrorMessage"] = "PLan Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(PLan);
        }
        #endregion

        #region Edit PLan
        public ActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Inavild Id";
                return RedirectToAction(nameof(Index));
            }

            var PLan = _planService.GetPlanToUpdate(id);
            if (PLan is null)
            {
                TempData["ErrorMessage"] = "Plan Can Not Be Updated";
                return RedirectToAction(nameof(Index));
            }
            return View(PLan);
        }

        [HttpPost]
        public ActionResult Edit([FromRoute] int id, UpdatePLanViewModel UpdatedPlan)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("WrongData", "Check Data Validation");
                return View(UpdatedPlan);
            }

            var Result = _planService.UpdatePlan(id, UpdatedPlan);
            if (Result)
                TempData["SuccessMessage"] = "Plan Update Successfully";
            else
                TempData["ErrorMessage"] = "Failed To Update Plan";

            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Activate Plan
        [HttpPost]
        public ActionResult Activate(int id)
        {
            var Result = _planService.TogglePlanStatus(id);
            if (Result)
                TempData["SuccessMessage"] = "Plan Status Changed Successfully";
            else
                TempData["ErrorMessage"] = "Failed To Update Plan Status";
            return RedirectToAction(nameof(Index));
        }
        #endregion
    }
}
