using GymManagementBLL.ViewModels.MemberViewModels;

namespace GymManagementBLL.Services.Interfaces
{
    public interface IMemberService
    {
        IEnumerable<MemberViewModel> GetAllMembers();
        bool CreateMember(CreateMemberViewModel createMember);
        MemberViewModel? GetMemberDetails(int MemberId);
        HealthRecordViewModel? GetMemberHealthRecordDetails(int MemberId);
        MemberToUpdateViewModel? GetMemberToUpdate(int MemberId);
        bool UpdateMemberDetails(int Id, MemberToUpdateViewModel updateMember);
        bool RemoveMember(int MemberId);
    }
}
