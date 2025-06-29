// Data/Seed/AdminSeeder.cs
using Microsoft.AspNetCore.Identity;
using e_Governance.Models;

public static class AdminSeeder
{
    public static async Task SeedAdminAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        string adminEmail = "admin@gov.com";
        string adminUsername = "admin";
        string adminPassword = "Admin@123"; // ⚠️ Use strong password

        // Ensure roles exist
        string[] roles = { "Admin", "Clerk", "Customer" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Check if admin exists
        var existingAdmin = await userManager.FindByNameAsync(adminUsername);
        if (existingAdmin == null)
        {
            var adminUser = new ApplicationUser
            {
                UserName = adminUsername,
                Email = adminEmail,
                Name = "System Administrator",
                UserTypeId = 1 // Admin
            };

            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }
    }
}
