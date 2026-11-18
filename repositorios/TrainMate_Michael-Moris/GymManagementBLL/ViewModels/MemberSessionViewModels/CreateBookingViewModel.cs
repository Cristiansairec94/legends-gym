using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.ViewModels.MemberSessionViewModels
{
    public class CreateBookingViewModel
    {
        [Required]
        public int SessionId { get; set; }

        [Required]
        public int MemberId { get; set; }
    }
}
