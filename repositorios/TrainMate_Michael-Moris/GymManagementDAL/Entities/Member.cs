namespace GymManagementDAL.Entities
{
    public class Member : GymUser
    {
        //JoinDate = CreatedAt OF BaseEntity
        public string Photo { get; set; } = null!;

        #region Relationships

        #region Member - HealthRecord
        public HealthRecord HealthRecord { get; set; } = null!;
        #endregion

        #region Member - MemberShips
        public ICollection<MemberShip> MemberShips { get; set; } = null!;
        #endregion

        #region Member - MemberSession
        public ICollection<MemberSession> MemberSessions { get; set; } = null!;
        #endregion

        #endregion
    }
}
