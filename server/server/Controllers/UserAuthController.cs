using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using server.Models;
using server.Models.DTOs;
using server.Services;
using System;
using System.Security.Claims;
using System.Security.Cryptography;

namespace e_Governance.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserAuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly JwtService _jwtService;
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<UserAuthController> _logger;

        public UserAuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            IEmailService emailService,
            JwtService jwtService,
            ApplicationDbContext dbContext,
            ILogger<UserAuthController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _emailService = emailService;
            _jwtService = jwtService;
            _dbContext = dbContext;
            _logger = logger;
        }

        // ------------------ Register Customer (Step 1) ------------------
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for register: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            var existingUserByEmail = await _userManager.FindByEmailAsync(model.Email);
            if (existingUserByEmail != null)
            {
                _logger.LogWarning("Email already registered: {Email}", model.Email);
                return BadRequest(new { message = "Email is already registered." });
            }

            var existingUserByUsername = await _userManager.FindByNameAsync(model.Username);
            if (existingUserByUsername != null)
            {
                _logger.LogWarning("Username already taken: {Username}", model.Username);
                return BadRequest(new { message = "Username is already taken." });
            }

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                Name = model.Name,
                Address = model.Address,
                DOB = model.DOB,
                UserTypeId = 3 // Customer
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to create user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                return BadRequest(new { message = "Registration failed. Please try again." });
            }

            await _userManager.AddToRoleAsync(user, "Customer");

            var roles = await _userManager.GetRolesAsync(user);
            var userTypeId = user.UserTypeId ?? 1; // Default to 1 for Admins
            if (userTypeId == 1 && !roles.Contains("Admin"))
            {
                userTypeId = 3; // Fallback to Customer
                user.UserTypeId = 3;
                await _userManager.UpdateAsync(user);
            }

            // Check if customer profile exists
            var requiresCustomerProfile = userTypeId == 3 &&
                !await _dbContext.Customers.AnyAsync(c => c.UserId == user.Id);
            int? branchId = null;
            if (roles.Contains("BranchAdmin"))
            {
                var branchAdmin = await _dbContext.BranchAdmins
                    .FirstOrDefaultAsync(ba => ba.UserId == user.Id);
                branchId = branchAdmin?.BranchId;
            }
            else if (roles.Contains("Clerk"))
            { 
                var clerk = await _dbContext.Employees
                    .FirstOrDefaultAsync(c => c.UserId == user.Id);
                branchId = clerk?.BranchId;
            }
            // Add other roles as needed
            var token = await _jwtService.GenerateToken(user, roles);

            _logger.LogInformation("User logged in successfully: {Username}", model.Username);
            return Ok(new
            {
                message = "Login successful",
                token,
                role = roles.FirstOrDefault(),
                userTypeId,
                requiresCustomerProfile,
                branchId
            });
        }

        // Replace or add this method - Create Employee by BranchAdmin
        [HttpPost("create-employee")]
        [Authorize(Roles = "BranchAdmin")] // Changed from "Admin" to "BranchAdmin"
        public async Task<IActionResult> CreateEmployee(RegisterEmployeeViewModel model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for create-employee: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            // Get the current BranchAdmin user
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUser = await _userManager.FindByIdAsync(currentUserId);

            if (currentUser == null)
            {
                return BadRequest(new { message = "Current user not found." });
            }

            // Get the BranchAdmin's branch ID
            var branchAdmin = await _dbContext.BranchAdmins
                .FirstOrDefaultAsync(ba => ba.UserId == currentUserId);

            if (branchAdmin?.BranchId == null)
            {
                return BadRequest(new { message = "Branch Admin must be assigned to a branch." });
            }

            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Email already exists for create-employee: {Email}", model.Email);
                return BadRequest(new { message = "Email already exists." });
            }

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                Name = model.Name,
                Address = model.Address,
                DOB = model.DOB,
                UserTypeId = 2, // Employee/Clerk
                IsPasswordPending = true
            };

            // Generate secure temporary password
            var tempPassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(12)) + "Ab1!";
            var result = await _userManager.CreateAsync(user, tempPassword);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to create employee: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                return BadRequest(new { message = "Employee creation failed. Please try again." });
            }

            await _userManager.AddToRoleAsync(user, "Clerk");

            // IMPORTANT: Create Employee record with BranchId
            var employee = new Employee
            {
                Username = user.UserName,
                Email = user.Email,
                Name = user.Name,
                Address = user.Address,
                DOB = model.DOB,
                UserTypeId = 2,
                BranchId = branchAdmin.BranchId, // Assign to BranchAdmin's branch
                ContactNo = model.Email, // You might want to add a phone number field
                Status = "Active",
                UserId = user.Id
            };

            _dbContext.Employees.Add(employee);
            await _dbContext.SaveChangesAsync();

            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(resetToken)}";

            var employeeWelcomeMessage = $@"
    <p>Welcome to the E-Governance System!</p>
    <p>We are glad to have you onboard as an employee.</p>
    <p><strong>Here is your username:</strong> {user.UserName}</p>
    <p>You have been assigned to branch: {branchAdmin.BranchId}</p>
    <p>To set your password and activate your account, please click the link below:</p>
    <p><a href='{resetLink}'>Click here to set your password</a></p>
    <br/>
    <p>Thank you,<br/>Admin Team</p>";

            await _emailService.SendAsync(user.Email, "Welcome to the System - Set Your Password", employeeWelcomeMessage);

            _logger.LogInformation("Employee created successfully: {Username} for branch {BranchId}", model.Username, branchAdmin.BranchId);
            return Ok(new
            {
                message = "Employee created and email sent to set password.",
                branchId = branchAdmin.BranchId
            });
        }
        // ------------------ Create Branch Admin ------------------
        [HttpPost("create-branch-admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBranchAdmin(RegisterBranchAdminViewModel model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for create-branch-admin: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Email already exists for create-branch-admin: {Email}", model.Email);
                return BadRequest(new { message = "Email already exists." });
            }

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                Name = model.Name,
                Address = model.Address,
                DOB = model.DOB,
                UserTypeId = 4, // Assuming 4 for BranchAdmin, adjust if different
                IsPasswordPending = true
            };

            // Generate secure temporary password
            var tempPassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(12)) + "Ab1!";
            var result = await _userManager.CreateAsync(user, tempPassword);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to create branch admin: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                return BadRequest(new { message = "Branch admin creation failed. Please try again." });
            }

            await _userManager.AddToRoleAsync(user, "BranchAdmin");
            var branchAdmin = new BranchAdmin
            {
                Username = user.UserName,
                Email = user.Email,
                Name = user.Name,
                Address = user.Address,
                DOB = model.DOB, // Use DOB from the ViewModel instead
                UserTypeId = 4,
                BranchId = model.BranchId,
                ContactNo = model.Email, // Use email as contact for now
                Status = "Active",
                UserId = user.Id
            };

            _dbContext.BranchAdmins.Add(branchAdmin);
            await _dbContext.SaveChangesAsync();

            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(resetToken)}";

            var branchAdminWelcomeMessage = $@"
            <p>Welcome to the E-Governance System!</p>
            <p>We are glad to have you onboard as a Branch Admin.</p>
            <p><strong>Here is your username:</strong> {user.UserName}</p>
            <p>To set your password and activate your account, please click the link below:</p>
            <p><a href='{resetLink}'>Click here to set your password</a></p>
            <br/>
            <p>Thank you,<br/>Admin Team</p>";

            await _emailService.SendAsync(user.Email, "Welcome to the System - Set Your Password", branchAdminWelcomeMessage);

            _logger.LogInformation("Branch Admin created successfully: {Username}", model.Username);
            return Ok(new { message = "Branch Admin created and email sent to set password." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for login: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            try
            {
                var user = await _userManager.FindByNameAsync(model.Username);
                if (user == null)
                {
                    _logger.LogWarning("Login failed: User not found for username {Username}", model.Username);
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                if (user.IsPasswordPending)
                {
                    _logger.LogWarning("Login failed: Password pending for user {Username}", model.Username);
                    return Unauthorized(new { message = "Your account requires a password setup. Please check your email for the reset link or use Forgot Password." });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
                if (!result.Succeeded)
                {
                    _logger.LogWarning("Login failed: Invalid password for user {Username}", model.Username);
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                var roles = await _userManager.GetRolesAsync(user);
                var userTypeId = user.UserTypeId ?? 1;
                if (userTypeId == 1 && !roles.Contains("Admin"))
                {
                    userTypeId = 3;
                    user.UserTypeId = 3;
                    await _userManager.UpdateAsync(user);
                }

                var requiresCustomerProfile = userTypeId == 3 &&
                    !await _dbContext.Customers.AnyAsync(c => c.UserId == user.Id);

                // FIXED: Get branch ID for both BranchAdmins AND Clerks
                int? branchId = null;
                if (roles.Contains("BranchAdmin"))
                {
                    var branchAdmin = await _dbContext.BranchAdmins
                        .FirstOrDefaultAsync(ba => ba.UserId == user.Id);
                    branchId = branchAdmin?.BranchId;
                    _logger.LogInformation("BranchAdmin login - Branch ID: {BranchId}", branchId);
                }
                else if (roles.Contains("Clerk"))
                {
                    // ADD THIS: Get branch ID for Clerks/Employees
                    var employee = await _dbContext.Employees
                        .FirstOrDefaultAsync(e => e.UserId == user.Id);
                    branchId = employee?.BranchId;
                    _logger.LogInformation("Clerk login - Branch ID: {BranchId}", branchId);
                }

                // FIXED: Pass branchId to token generation
                var token = await _jwtService.GenerateToken(user, roles, branchId);

                _logger.LogInformation("User logged in successfully: {Username} with branchId: {BranchId}", model.Username, branchId);
                return Ok(new
                {
                    message = "Login successful",
                    token,
                    role = roles.FirstOrDefault(),
                    userTypeId,
                    requiresCustomerProfile,
                    branchId,
                    user = new
                    {
                        id = user.Id,
                        userName = user.UserName,
                        email = user.Email,
                        name = user.Name,
                        branchId = branchId
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for user {Username}", model.Username);
                return StatusCode(500, new { message = "An error occurred during login. Please try again." });
            }
        }
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for forgot-password: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning("Forgot password failed: User not found for email {Email}", model.Email);
                return BadRequest(new { message = "User not found" });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";

            var forgotPasswordMessage = $@"
            <p>We received a request to reset your password.</p>
            <p>If you made this request, click the link below to change your password:</p>
            <p><a href='{resetLink}'>Reset your password</a></p>
            <br/>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>";

            await _emailService.SendAsync(user.Email, "Reset Your Forgotten Password", forgotPasswordMessage);

            _logger.LogInformation("Password reset email sent for user with email {Email}", model.Email);
            return Ok(new { message = "Password reset link sent to email" });
        }

        // ------------------ Reset Password ------------------
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for reset-password: {Errors}", string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(new { message = "Invalid input data." });
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning("Reset password failed: User not found for email {Email}", model.Email);
                return BadRequest(new { message = "User not found." });
            }

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (!result.Succeeded)
            {
                _logger.LogWarning("Reset password failed for user {Email}: {Errors}", model.Email, string.Join(", ", result.Errors.Select(e => e.Description)));
                return BadRequest(new { message = "Password reset failed. Please try again." });
            }

            user.IsPasswordPending = false;
            await _userManager.UpdateAsync(user);

            _logger.LogInformation("Password reset successful for user {Email}", model.Email);
            return Ok(new { message = "Password reset successful. You may now login." });
        }
    }
}