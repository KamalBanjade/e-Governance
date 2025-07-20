using Microsoft.AspNetCore.Identity;
using e_Governance.Models;

public static class AdminSeeder
{
    public static async Task SeedAdminAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        string adminEmail = "admin@gmail.com";
        string adminUsername = "admin";
        string adminPassword = "Admin@123";

        Console.WriteLine("=== Starting Admin Seeding ===");

        // Ensure roles exist
        string[] roles = { "Admin", "Clerk", "Customer" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
                Console.WriteLine($"✓ Created role: {role}");
            }
        }

        // Check if admin exists
        var existingAdmin = await userManager.FindByNameAsync(adminUsername);
        if (existingAdmin == null)
        {
            Console.WriteLine("Creating new admin user...");
            var adminUser = new ApplicationUser
            {
                UserName = adminUsername,
                Email = adminEmail,
                EmailConfirmed = true,
                Name = "System Administrator",
                UserTypeId = 1 // EXPLICITLY set to 1 for Admin
            };

            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
                Console.WriteLine("✓ Admin user created successfully");
                var createdUser = await userManager.FindByNameAsync(adminUsername);
                Console.WriteLine($"✓ Admin UserTypeId: {createdUser.UserTypeId}");
            }
            else
            {
                Console.WriteLine("✗ Failed to create admin user:");
                foreach (var error in result.Errors)
                {
                    Console.WriteLine($"  - {error.Code}: {error.Description}");
                }
            }
        }
        else
        {
            Console.WriteLine("✓ Admin user already exists");
            Console.WriteLine($"✓ Current UserTypeId: {existingAdmin.UserTypeId}");
            if (existingAdmin.UserTypeId != 1)
            {
                existingAdmin.UserTypeId = 1;
                await userManager.UpdateAsync(existingAdmin);
                Console.WriteLine("✓ Updated admin UserTypeId to 1");
            }

            var existingRoles = await userManager.GetRolesAsync(existingAdmin);
            if (!existingRoles.Contains("Admin"))
            {
                await userManager.AddToRoleAsync(existingAdmin, "Admin");
                Console.WriteLine("✓ Added Admin role to existing user");
            }
        }

        Console.WriteLine("=== Admin Seeding Completed ===");
    }
}