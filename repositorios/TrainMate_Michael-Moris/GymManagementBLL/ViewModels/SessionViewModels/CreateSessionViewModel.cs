using System.ComponentModel.DataAnnotations;

namespace GymManagementSystemBLL.ViewModels.SessionViewModels
{
    public class CreateSessionViewModel
    {
        [Required(ErrorMessage = "Description Is Required")]
        [StringLength(500, MinimumLength = 10, ErrorMessage = "Description Must Be Between 10 And 500 Characters")]
        public string Description { get; set; } = null!;

        [Required(ErrorMessage = "Capacity Is Required")]
        [Range(0, 25, ErrorMessage = "Capacity Must Be Between 0 And 25")]
        public int Capacity { get; set; }

        [Required(ErrorMessage = "Start Date Is Required")]
        [Display(Name = "Start Date & Time")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "End Date Is Required")]
        [Display(Name = "End Date & Time")]
        public DateTime EndDate { get; set; }

        [Required(ErrorMessage = "Trainer Is Required")]
        [Display(Name = "Trainer")]
        public int TrainerId { get; set; }

        [Required(ErrorMessage = "Category Is Required")]
        [Display(Name = "Category")]
        public int CategoryId { get; set; }
    }
}
