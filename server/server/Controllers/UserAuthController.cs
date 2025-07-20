using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using server.Models;
using server.Models.DTOs;
using server.Services;
using System.Security.Claims;

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

        public UserAuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            IEmailService emailService,
            JwtService jwtService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _emailService = emailService;
            _jwtService = jwtService;
        }

        // ------------------ Register Customer (Step 1) ------------------
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            var existingUserByEmail = await _userManager.FindByEmailAsync(model.Email);
            if (existingUserByEmail != null)
                return BadRequest(new { message = "Email is already registered." });

            var existingUserByUsername = await _userManager.FindByNameAsync(model.Username);
            if (existingUserByUsername != null)
                return BadRequest(new { message = "Username is already taken." });

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

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, "Customer");

                var roles = await _userManager.GetRolesAsync(user);
                var token = _jwtService.GenerateToken(user, roles);

                return Ok(new
                {
                    message = "Account created successfully. Please complete your customer profile.",
                    requiresCustomerProfile = true,
                    token = token,
                    role = roles.FirstOrDefault(),
                    userTypeId = user.UserTypeId
                });
            }
            return BadRequest(new { errors = result.Errors });
        }

        [HttpPost("create-employee")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateEmployee(RegisterEmployeeViewModel model)
        {
            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
                return BadRequest(new { message = "Email already exists." });

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                Name = model.Name,
                Address = model.Address,
                DOB = model.DOB,
                UserTypeId = model.UserTypeId,
                IsPasswordPending = true
            };

            // Generate unguessable temp password
            var tempPassword = Guid.NewGuid().ToString() + "Ab1!";
            var result = await _userManager.CreateAsync(user, tempPassword);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            string role = model.UserTypeId switch
            {
                2 => "Clerk",
                _ => "Customer"
            };

            await _userManager.AddToRoleAsync(user, role);

            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={user.Email}&token={Uri.EscapeDataString(resetToken)}";

            var employeeWelcomeMessage = $@"
            <p>Welcome to the E-Governance System!</p>
            <p>We are glad to have you onboard.</p>
            <p><strong>Here is your username:</strong> {user.UserName}</p>
            <p>To set your password and activate your account, please click the link below:</p>
            <p><a href='{resetLink}'>Click here to set your password</a></p>
            <br/>
            <p>Thank you,<br/>Admin Team</p>";

            await _emailService.SendAsync(user.Email, "Welcome to the System - Set Your Password", employeeWelcomeMessage);

            return Ok(new { message = "Employee created and email sent to set password." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            try
            {
                var user = await _userManager.FindByNameAsync(model.Username);
                if (user == null)
                    return Unauthorized(new { message = "Invalid credentials" });

                // NEW: Block if password is pending
                if (user.IsPasswordPending)
                {
                    return Unauthorized(new { message = "Your account requires a password setup. Please check your email for the reset link or use Forgot Password." });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
                if (!result.Succeeded)
                    return Unauthorized(new { message = "Invalid credentials" });

                var roles = await _userManager.GetRolesAsync(user);
                var token = _jwtService.GenerateToken(user, roles);

                var userTypeId = user.UserTypeId ?? 0;

                // Keep your Admin fix
                if (userTypeId == 0 && roles.Contains("Admin"))
                {
                    userTypeId = 1;
                    user.UserTypeId = 1;
                    await _userManager.UpdateAsync(user);
                }

                var response = new
                {
                    message = "Login successful",
                    token,
                    role = roles.FirstOrDefault(),
                    userTypeId = userTypeId
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return BadRequest(new { message = "User not found" });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={user.Email}&token={Uri.EscapeDataString(token)}";

            var forgotPasswordMessage = $@"
    <p>We received a request to reset your password.</p>
    <p>If you made this request, click the link below to change your password:</p>
    <p><a href='{resetLink}'>Reset your password</a></p>
    <br/>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>";

            await _emailService.SendAsync(user.Email, "Reset Your Forgotten Password", forgotPasswordMessage);

            return Ok(new { message = "Password reset link sent to email" });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return BadRequest(new { message = "User not found." });

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (!result.Succeeded)
                return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });

            user.IsPasswordPending = false;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Password reset successful. You may now login." });
        }
    }
}