using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.ViewModels.MemberViewModels
{
    public class HealthRecordViewModel
    {
        [Required(ErrorMessage = "Height Is Required")]
        [Range(0.1, 300, ErrorMessage = "Height Must Be Greater Than 0 And Less Than 300 cm")]
        public decimal Height { get; set; }

        [Required(ErrorMessage = "Weight Is Required")]
        [Range(0.1, 500, ErrorMessage = "Weight Must Be Greater Than 0 And Less Than 500 kg")]
        public decimal Weight { get; set; }

        [Required(ErrorMessage = "Blood Type Is Required")]
        [StringLength(3, ErrorMessage = "Blood Type Must Be 3 Characters Or Less")]
        public string BloodType { get; set; } = null!;
        public string? Note { get; set; }
    }
}
