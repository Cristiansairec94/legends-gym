using GymManagementBLL.Services.Interfaces;
using GymManagementBLL.ViewModels.MemberViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    [Authorize(Roles = "SuperAdmin")]
    public class MemberController : Controller
    {
        private readonly IMemberService _memberService;

        public MemberController(IMemberService memberService)
        {
            _memberService = memberService;
        }

        #region Get All Members
        public ActionResult Index()
        {
            var Members = _memberService.GetAllMembers();
            return View(Members);
        }

        #endregion

        #region Get Member Data

        public ActionResult MemberDetails(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id of Member Can Not Be 0 or Negative Number";
                return RedirectToAction(nameof(Index));
            }
            var Member = _memberService.GetMemberDetails(id);
            if (Member is null)
            {
                TempData["ErrorMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(Member);
        }

        public ActionResult HealthRecordDetails(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id of Member Can Not Be 0 or Negative Number";
                return RedirectToAction(nameof(Index));
            }
            var MemberHealthRecord = _memberService.GetMemberHealthRecordDetails(id);
            if (MemberHealthRecord is null)
            {
                TempData["ErrorMessage"] = "HealthRecord Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(MemberHealthRecord);
        }

        #endregion

        #region Create Member
        public ActionResult CreateMember()
        {
            return View();
        }

        [HttpPost]
        public ActionResult CreateMemberSubmit(CreateMemberViewModel CreatedMember)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("InvalidData", "Check Data and Missing Fields");
                return View(nameof(CreateMember), CreatedMember);
            }
            bool Result = _memberService.CreateMember(CreatedMember);
            if (Result)
                TempData["SuccessMessage"] = "Member Created Successfully";
            else
                TempData["ErrorMessage"] = "Failed to Create Member, Check Phone And Email";

            return RedirectToAction(nameof(Index));
        }
        #endregion

        #region Edit Member

        public ActionResult MemberEdit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id of Member Can Not Be 0 or Negative Number";
                return RedirectToAction(nameof(Index));
            }
            var Member = _memberService.GetMemberToUpdate(id);
            if (Member is null)
            {
                TempData["ErrorMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(Member);
        }

        [HttpPost]
        public ActionResult MemberEdit([FromRoute] int id, MemberToUpdateViewModel MemberToEdit)
        {
            if (!ModelState.IsValid)
                return View(MemberToEdit);
            var Result = _memberService.UpdateMemberDetails(id, MemberToEdit);
            if (Result)
                TempData["SuccessMessage"] = "Member Updated Successfully";
            else
                TempData["ErrorMessage"] = "Failed to Update Member";
            return RedirectToAction(nameof(Index));
        }

        #endregion

        #region Delete Member

        public ActionResult Delete(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id of Member Can Not Be 0 or Negative Number";
                return RedirectToAction(nameof(Index));
            }

            var Member = _memberService.GetMemberDetails(id);
            if (Member is null)
            {
                TempData["SuccessMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));
            }
            ViewBag.MemberId = id;
            ViewBag.MemberName = Member.Name;
            return View();
        }

        [HttpPost]
        public ActionResult DeleteConfirmed([FromForm] int id)
        {
            var Result = _memberService.RemoveMember(id);
            if (Result)
                TempData["SuccessMessage"] = "Member Deleted Successfully";
            else
                TempData["ErrorMessage"] = "Failed to Delete Member";
            return RedirectToAction(nameof(Index));
        }
        #endregion
    }
}
