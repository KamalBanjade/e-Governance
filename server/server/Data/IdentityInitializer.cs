using e_Governance.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;

namespace e_Governance.Data
{
    public static class IdentityInitializer
    {
        public static async Task SeedRolesAndAdminAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            string[] roles = { "Admin", "Clerk", "Customer", "BranchAdmin" };

            // Create roles if they don't exist
            foreach (var role in roles)
            {
                var normalizedRoleName = roleManager.NormalizeKey(role);
                var roleExists = await roleManager.Roles.AnyAsync(r =>
                    r.NormalizedName == normalizedRoleName);

                if (!roleExists)
                {
                    var identityRole = new IdentityRole(role);
                    await roleManager.CreateAsync(identityRole);
                }
            }

            // Seed a default Admin user
            var adminEmail = "admin@example.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                var user = new ApplicationUser
                {
                    UserName = "admin",
                    Email = adminEmail,
                    Name = "Admin User",
                    EmailConfirmed = true,
                    UserTypeId = 1 // Assuming 1 is for Admin
                };

                var result = await userManager.CreateAsync(user, "Admin@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, "Admin");
                }
            }
        }
    }
}