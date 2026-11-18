using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.TrainerViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    [Authorize(Roles = "SuperAdmin")]
    public class TrainerController : Controller
    {
        private readonly ITrainerService _trainerService;

        public TrainerController(ITrainerService trainerService)
        {
            _trainerService = trainerService;
        }

        #region Get All Trainers
        public ActionResult Index()
        {
            var Trainers = _trainerService.GetAllTrainers();
            return View(Trainers);
        }
        #endregion

        #region Create Trainer
        public ActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public IActionResult CreateTrainer(CreateTrainerViewModel CreatedTrainer)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("DataMissed", "Check Missing Fields");
                return View(nameof(Create), CreatedTrainer);
            }
            var Result = _trainerService.CreateTrainer(CreatedTrainer);

            if (Result)

                TempData["SuccessMessage"] = "Trainer Created Successfuly";
            else
                TempData["ErrorMessage"] = "Failed to Create Trainer";
            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Trainer Details
        public IActionResult Details(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id";
                return RedirectToAction(nameof(Index));
            }
            var Trainer = _trainerService.GetTrainerDetails(id);
            if (Trainer == null)
            {
                TempData["ErrorMessage"] = "Trainer Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(Trainer);
        }
        #endregion

        #region Edit Trainer
        public IActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id";
                return RedirectToAction(nameof(Index));
            }
            var Trainer = _trainerService.GetTrainerToUpdate(id);
            if (Trainer == null)
            {
                TempData["ErrorMessage"] = "Trainer Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(Trainer);
        }

        [HttpPost]
        public IActionResult Edit([FromRoute] int id, TrainerToUpdateViewModel UpdatedTrainer)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("DataMissed", "Check Missing Fields");
                return View(UpdatedTrainer);
            }
            var Result = _trainerService.UpdateTrainerDetails(UpdatedTrainer, id);

            if (Result)

                TempData["SuccessMessage"] = "Trainer Updated Successfuly";
            else
                TempData["ErrorMessage"] = "Failed to Updated Trainer";
            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Delete Trainer
        public ActionResult Delete(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id";
                return RedirectToAction(nameof(Index));
            }
            var Trainer = _trainerService.GetTrainerDetails(id);

            if (Trainer == null)
            {
                TempData["ErrorMessage"] = "Trainer Not Found";
                return RedirectToAction(nameof(Index));
            }
            ViewBag.TrainerId = Trainer.Id;
            return View();
        }

        [HttpPost]
        public ActionResult DeleteConfirmed(int id)
        {
            var Result = _trainerService.RemoveTrainer(id);
            if (Result)
                TempData["SuccessMessage"] = "Trainer Deleted Successfuly";
            else
                TempData["ErrorMessage"] = "Failed To Delete Trainer";
            return RedirectToAction(nameof(Index));
        }
        #endregion
    }
}
