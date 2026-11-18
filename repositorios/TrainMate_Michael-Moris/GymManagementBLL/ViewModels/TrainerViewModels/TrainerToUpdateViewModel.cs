using GymManagementDAL.Entities.Enums;
using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.ViewModels.TrainerViewModels
{
    public class TrainerToUpdateViewModel
    {
        public string Name { get; set; } = null!;

        [Required(ErrorMessage = "Email Is Required")]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Phone Number Is Required")]
        [Phone(ErrorMessage = "Invalid Phone Number")]
        [RegularExpression(@"^(010|011|012|015)\d{8}$", ErrorMessage = "Phone Number Must Be A Valid Egyptian Number.")]
        public string Phone { get; set; } = null!;

        [Required(ErrorMessage = "Street Is Required")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Street Cannot Be Longer Than 150 Characters.")]
        [RegularExpression(@"^[a-zA-Z\s]+$", ErrorMessage = "Street Can Only Contain Letters And Spaces.")]
        public string Street { get; set; } = null!;

        [Required(ErrorMessage = "Building Number Is Required")]
        [Range(1, int.MaxValue, ErrorMessage = "Building Number Must Be Greater Than 0")]
        public int BuildingNumber { get; set; }

        [Required(ErrorMessage = "City Is Required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "City Cannot Be Longer Than 100 Characters.")]
        [RegularExpression(@"^[a-zA-Z\s]+$", ErrorMessage = "City Can Only Contain Letters And Spaces.")]
        public string City { get; set; } = null!;

        [Required(ErrorMessage = "Specialties Is Required")]
        public Specialties Specialties { get; set; }
    }
}
