using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberSessionViewModels;
using GymManagementBLL.ViewModels.MemberViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GymManagementPL.Controllers
{
    [Authorize(Roles = "SuperAdmin,Admin")]
    public class MemberSessionController : Controller
    {
        private readonly IMemberSessionService _memberSessionService;
        private readonly ISessionService _sessionService;
        private readonly IMemberService _memberService;
        public MemberSessionController(
           IMemberSessionService memberSessionService,
           ISessionService sessionService,
           IMemberService memberService)
        {
            _memberSessionService = memberSessionService;
            _sessionService = sessionService;
            _memberService = memberService;
        }

        #region GetAll MemberSessions

        public IActionResult Index()
        {
            var sessions = _memberSessionService.GetSessionsForBookingAndAttendance();
            return View(sessions);
        }

        #endregion

        #region Get Members

        public IActionResult GetMembersForUpcomingSession(int sessionId)
        {
            var members = _memberSessionService.GetMembersForSession(sessionId);
            ViewBag.SessionId = sessionId;
            return View(members);
        }

        public IActionResult GetMembersForOngoingSessions(int sessionId)
        {
            var members = _memberSessionService.GetMembersForSession(sessionId);
            ViewBag.SessionId = sessionId;
            return View(members);
        }

        #endregion

        #region Create Booking

        public IActionResult Create(int sessionId)
        {
            LoadMembersDropDown();
            ViewBag.SessionId = sessionId;
            return View(new CreateBookingViewModel { SessionId = sessionId });
        }

        [HttpPost]
        public IActionResult Create(CreateBookingViewModel model)
        {
            if (!ModelState.IsValid)
            {
                LoadMembersDropDown();
                ViewBag.SessionId = model.SessionId;
                ModelState.AddModelError("InvalidData", "Please select a member.");
                return View(model);
            }

            var ok = _memberSessionService.CreateBooking(model.SessionId, model.MemberId);
            TempData[ok ? "SuccessMessage" : "ErrorMessage"] = ok
                ? "Booking created successfully."
                : "Failed to create booking. Member might already be booked or session is full.";

            return RedirectToAction(nameof(GetMembersForUpcomingSession), new { sessionId = model.SessionId });
        }

        #endregion

        #region Cancel Booking

        [HttpPost]
        public IActionResult Cancel(int memberId, int sessionId)
        {
            var ok = _memberSessionService.CancelBooking(memberId, sessionId);
            TempData[ok ? "SuccessMessage" : "ErrorMessage"] = ok
                ? "Booking canceled successfully."
                : "Failed to cancel booking.";
            return RedirectToAction(nameof(GetMembersForUpcomingSession), new { sessionId });
        }

        #endregion

        #region Mark Attendance

        [HttpPost]
        public IActionResult MarkAttended(int memberId, int sessionId)
        {
            var ok = _memberSessionService.MarkAttended(memberId, sessionId);
            TempData[ok ? "SuccessMessage" : "ErrorMessage"] = ok
                ? "Member marked as attended."
                : "Failed to update attendance.";
            return RedirectToAction(nameof(GetMembersForOngoingSessions), new { sessionId });
        }

        #endregion

        #region Helpers
        private void LoadMembersDropDown()
        {
            var members = _memberService.GetAllMembers() ?? new List<MemberViewModel>();
            ViewBag.Members = new SelectList(members, "Id", "Name");
        }
        #endregion
    }
}
