namespace GymManagementDAL.Entities
{
    public class Session : BaseEntity
    {
        #region Properties
        public string Description { get; set; } = null!;
        public int Capacity { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        #endregion

        #region Relationships

        #region Session - Category
        public int CategoryId { get; set; }
        public Category SessionCategory { get; set; } = null!;
        #endregion

        #region Session - Trainer
        public int TrainerId { get; set; }
        public Trainer SessionTrainer { get; set; } = null!;
        #endregion

        #region Session - MemberSession
        public ICollection<MemberSession> SessionMembers { get; set; } = null!;
        #endregion

        #endregion
    }
}
