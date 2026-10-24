using GymManagementDAL.Entities;
using Microsoft.AspNetCore.Identity;

namespace GymManagementDAL.Data.DataSeed
{
    public static class IdentityDbContextSeeding
    {
        public static bool SeedData(RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager)
        {
            try
            {
                var HasUsers = userManager.Users.Any();
                var HasRoles = roleManager.Roles.Any();
                if (HasUsers && HasRoles) return false;

                if (!HasRoles)
                {
                    var Roles = new List<IdentityRole>()
                    {
                        new(){Name="SuperAdmin"},
                        new(){Name="Admin"}
                    };

                    foreach (var role in Roles)
                    {
                        if (!roleManager.RoleExistsAsync(role.Name!).Result)
                        {
                            roleManager.CreateAsync(role).Wait();
                        }

                    }
                }

                if (!HasUsers)
                {
                    var MainAdmin = new ApplicationUser()
                    {
                        FirstName = "Michael",
                        LastName = "Moris",
                        UserName = "MichaelMoris",
                        Email = "michaelmorisdev@gmail.com",
                        PhoneNumber = "01200000000"
                    };
                    userManager.CreateAsync(MainAdmin, "P@ssw0rd").Wait();
                    userManager.AddToRoleAsync(MainAdmin, "SuperAdmin").Wait();

                    var Admin = new ApplicationUser()
                    {
                        FirstName = "Mark",
                        LastName = "Spector",
                        UserName = "MarkSpector",
                        Email = "markspector@gmail.com",
                        PhoneNumber = "01222222222"
                    };
                    userManager.CreateAsync(Admin, "P@ssw0rd").Wait();
                    userManager.AddToRoleAsync(Admin, "Admin").Wait();
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Seeding Failed : {ex}");
                return false;
            }
        }
    }
}
