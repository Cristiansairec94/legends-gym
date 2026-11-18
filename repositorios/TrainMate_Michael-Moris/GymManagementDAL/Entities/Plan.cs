namespace GymManagementDAL.Entities
{
    public class Plan : BaseEntity
    {
        #region Properties
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        #endregion

        public ICollection<MemberShip> PlanMembers { get; set; } = null!;
    }
}
