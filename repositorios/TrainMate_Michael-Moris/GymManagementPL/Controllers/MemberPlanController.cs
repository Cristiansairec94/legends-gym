using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberPlanViewModels;
using GymManagementBLL.ViewModels.MemberViewModels;
using GymManagementBLL.ViewModels.PlanViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GymManagementPL.Controllers
{
    [Authorize(Roles = "SuperAdmin,Admin")]
    public class MemberPlanController : Controller
    {
        private readonly IMemberPlanService _memberPlanService;
        private readonly IMemberService _memberService;
        private readonly IPlanService _planService;
        public MemberPlanController(IMemberPlanService memberPlanService, IMemberService memberService, IPlanService planService)
        {
            _memberPlanService = memberPlanService;
            _memberService = memberService;
            _planService = planService;
        }

        #region Get All MemberShips
        public IActionResult Index()
        {
            var MemberShips = _memberPlanService.GetAllMemberShips();
            return View(MemberShips);
        }
        #endregion

        #region Create MemberShip
        public IActionResult Create()
        {
            LoadDropDownsForMembers();
            LoadDropDownsForPlans();
            return View(new CreateMemberPlanViewModel());
        }

        [HttpPost]
        public IActionResult Create(CreateMemberPlanViewModel CreatedMemberPlan)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("InvalidData", "Check Data and Missing Fields");
                return View(nameof(Create), CreatedMemberPlan);
            }

            var result = _memberPlanService.CreateMembership(CreatedMemberPlan);
            if (result)
                TempData["SuccessMessage"] = "Membership Created Successfully.";
            else
                TempData["ErrorMessage"] = "Failed to Create Membership. Check Member, Plan, or Active Membership.";

            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Cancel memberShip
        [HttpPost]
        public IActionResult Cancel(int memberId, int planId)
        {
            var result = _memberPlanService.CancelMembership(memberId, planId);
            if (result)
                TempData["SuccessMessage"] = "Membership Cancelled Successfully.";
            else
                TempData["ErrorMessage"] = "Failed to Cancel Membership. It might already be expired.";

            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Helper Methods
        private void LoadDropDownsForMembers()
        {
            var members = _memberService.GetAllMembers() ?? new List<MemberViewModel>();
            ViewBag.Members = new SelectList(members, "Id", "Name");
        }

        private void LoadDropDownsForPlans()
        {
            var plans = _planService.GetAllPlans() ?? new List<PlanViewModel>();
            ViewBag.Plans = new SelectList(plans, "Id", "Name");
        }
        #endregion
    }
}
