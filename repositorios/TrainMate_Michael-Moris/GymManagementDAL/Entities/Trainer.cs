using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    public class Trainer : GymUser
    {
        //HireDate - CreatedAt Of BaseEntity
        public Specialties Specialties { get; set; }
        public ICollection<Session> TrainerSessions { get; set; } = null!;
    }
}
