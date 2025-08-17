// BranchAdminController.cs
using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using server.Services;

namespace e_Governance.Controllers
{
    [Authorize(Roles = "Admin,BranchAdmin")]
    [Route("api/branchadmins")]
    [ApiController]
    public class BranchAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<BranchAdminController> _logger;

        public BranchAdminController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IConfiguration configuration,
            IEmailService emailService,
            ILogger<BranchAdminController> logger)
        {
            _context = context;
            _userManager = userManager;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            try
            {
                var admins = await _context.BranchAdmins
                    .Include(a => a.Branch)
                    .Select(a => new
                    {
                        a.AdminId,
                        Name = a.Name,
                        a.ContactNo,
                        a.Status,
                        a.BranchId,
                        a.UserId,
                        BranchName = a.Branch != null ? a.Branch.Name : "Unknown",
                        a.Email,
                        a.Username,
                        a.Address,
                        a.DOB,
                        a.UserTypeId
                    })
                    .ToListAsync();
                _logger.LogInformation("Retrieved {Count} branch admins", admins.Count);
                return Ok(admins);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Index");
                return StatusCode(500, new { message = "An error occurred while retrieving branch admins." });
            }
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches()
        {
            try
            {
                var branches = await _context.Branches
                    .Select(b => new { b.BranchId, b.Name })
                    .ToListAsync();
                _logger.LogInformation("Retrieved {Count} branches", branches.Count);
                return Ok(branches);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetBranches");
                return StatusCode(500, new { message = "An error occurred while retrieving branches." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BranchAdmin admin)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Starting branch admin creation for username: {Username}", admin.Username);

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state: {Errors}", ModelState);
                    return BadRequest(ModelState);
                }

                if (!await _context.Branches.AnyAsync(b => b.BranchId == admin.BranchId))
                {
                    _logger.LogWarning("Invalid BranchId: {BranchId}", admin.BranchId);
                    return BadRequest(new { message = "Invalid BranchId." });
                }

                var existingUser = await _userManager.FindByEmailAsync(admin.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Email already exists: {Email}", admin.Email);
                    return BadRequest(new { message = "Email already exists." });
                }

                var user = new ApplicationUser
                {
                    UserName = admin.Username,
                    Email = admin.Email,
                    Name = admin.Name,
                    Address = admin.Address,
                    DOB = admin.DOB,
                    UserTypeId = admin.UserTypeId,
                    IsPasswordPending = true
                };

                var tempPassword = Guid.NewGuid().ToString() + "Ab1!";
                _logger.LogInformation("Creating ApplicationUser for username: {Username}", user.UserName);
                var result = await _userManager.CreateAsync(user, tempPassword);
                if (!result.Succeeded)
                {
                    _logger.LogError("Failed to create user: {Errors}", result.Errors);
                    return BadRequest(new { message = "Failed to create user.", errors = result.Errors });
                }

                string role = "BranchAdmin";
                _logger.LogInformation("Assigning role {Role} to user: {UserId}", role, user.Id);
                await _userManager.AddToRoleAsync(user, role);

                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetLink = $"{_configuration["AppSettings:ClientURL"]}/reset-password?email={user.Email}&token={Uri.EscapeDataString(resetToken)}";
                var welcomeMessage = $@"
                    <p>Welcome to the E-Governance System!</p>
                    <p>We are glad to have you onboard as a Branch Admin.</p>
                    <p><strong>Here is your username:</strong> {user.UserName}</p>
                    <p>To set your password and activate your account, please click the link below:</p>
                    <p><a href='{resetLink}'>Click here to set your password</a></p>
                    <br/>
                    <p>Thank you,<br/>Admin Team</p>";
                _logger.LogInformation("Sending welcome email to: {Email}", user.Email);
                await _emailService.SendAsync(user.Email, "Welcome to the System - Set Your Password", welcomeMessage);

                admin.UserId = user.Id;
                _logger.LogInformation("Adding branch admin record for username: {Username}", admin.Username);
                _context.BranchAdmins.Add(admin);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Branch Admin saved successfully with AdminId: {AdminId}", admin.AdminId);

                await transaction.CommitAsync();
                return Ok(new { message = "Branch Admin created successfully!", adminId = admin.AdminId });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error in Create for username: {Username}", admin.Username);
                return StatusCode(500, new { message = "An error occurred while creating the branch admin.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BranchAdmin admin)
        {
            try
            {
                if (id != admin.AdminId)
                {
                    _logger.LogWarning("Branch Admin ID mismatch: {Id} vs {AdminId}", id, admin.AdminId);
                    return BadRequest(new { message = "Branch Admin ID mismatch." });
                }

                var existingAdmin = await _context.BranchAdmins
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.AdminId == id);

                if (existingAdmin == null)
                {
                    _logger.LogWarning("Branch Admin not found: {Id}", id);
                    return NotFound(new { message = "Branch Admin not found." });
                }

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state: {Errors}", ModelState);
                    return BadRequest(ModelState);
                }

                if (!await _context.Branches.AnyAsync(b => b.BranchId == admin.BranchId))
                {
                    _logger.LogWarning("Invalid BranchId: {BranchId}", admin.BranchId);
                    return BadRequest(new { message = "Invalid BranchId." });
                }

                existingAdmin.Username = admin.Username;
                existingAdmin.Email = admin.Email;
                existingAdmin.Name = admin.Name;
                existingAdmin.Address = admin.Address;
                existingAdmin.DOB = admin.DOB;
                existingAdmin.UserTypeId = admin.UserTypeId;
                existingAdmin.ContactNo = admin.ContactNo;
                existingAdmin.Status = admin.Status;
                existingAdmin.BranchId = admin.BranchId;

                if (existingAdmin.User != null)
                {
                    existingAdmin.User.UserName = admin.Username;
                    existingAdmin.User.Email = admin.Email;
                    existingAdmin.User.Name = admin.Name;
                    existingAdmin.User.Address = admin.Address;
                    existingAdmin.User.DOB = admin.DOB;
                    existingAdmin.User.UserTypeId = admin.UserTypeId;
                    _context.Update(existingAdmin.User);
                }

                _context.Update(existingAdmin);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Branch Admin updated successfully with AdminId: {AdminId}", existingAdmin.AdminId);

                return Ok(new { message = "Branch Admin updated successfully!" });
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency error updating branch admin: {AdminId}", id);
                if (!BranchAdminExists(id))
                    return NotFound(new { message = "Branch Admin not found." });
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Update for branch admin: {AdminId}", id);
                return StatusCode(500, new { message = "An error occurred while updating the branch admin.", error = ex.Message });
            }
        }
        // Add this method to your BranchAdminController.cs

        [HttpGet("me")]
        [Authorize(Roles = "BranchAdmin")]
        public async Task<IActionResult> GetMyBranchInfo()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User not authenticated for GetMyBranchInfo");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                var branchAdmin = await _context.BranchAdmins
                    .Include(a => a.Branch)
                    .Where(a => a.UserId == userId)
                    .Select(a => new
                    {
                        a.AdminId,
                        Name = a.Name,
                        a.ContactNo,
                        a.Status,
                        a.BranchId,
                        a.UserId,
                        BranchName = a.Branch != null ? a.Branch.Name : "Unknown",
                        a.Email,
                        a.Username,
                        a.Address,
                        a.DOB,
                        a.UserTypeId
                    })
                    .FirstOrDefaultAsync();

                if (branchAdmin == null)
                {
                    _logger.LogWarning("Branch admin not found for user: {UserId}", userId);
                    return NotFound(new { message = "Branch admin record not found for current user." });
                }

                _logger.LogInformation("Retrieved branch info for user: {UserId}, BranchId: {BranchId}", userId, branchAdmin.BranchId);
                return Ok(branchAdmin);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMyBranchInfo");
                return StatusCode(500, new { message = "An error occurred while retrieving branch information." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var admin = await _context.BranchAdmins
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.AdminId == id);

                if (admin == null)
                {
                    _logger.LogWarning("Branch Admin not found: {Id}", id);
                    return NotFound(new { message = "Branch Admin not found." });
                }

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User not authenticated for delete: {Id}", id);
                    return Unauthorized(new { message = "User not authenticated." });
                }

                if (admin.User != null)
                {
                    _logger.LogInformation("Deleting ApplicationUser: {UserId}", admin.User.Id);
                    await _userManager.DeleteAsync(admin.User);
                }

                _logger.LogInformation("Deleting branch admin: {AdminId}", admin.AdminId);
                _context.BranchAdmins.Remove(admin);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Branch Admin deleted successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Delete for branch admin: {Id}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the branch admin.", error = ex.Message });
            }
        }

        private bool BranchAdminExists(int id)
        {
            return _context.BranchAdmins.Any(a => a.AdminId == id);
        }
    }
}