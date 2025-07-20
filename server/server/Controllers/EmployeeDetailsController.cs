using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration; // Add for IConfiguration
using Microsoft.Extensions.Logging; // Add for ILogger
using server.Services; // Add for IEmailService

namespace e_Governance.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeDetailsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration; // Add IConfiguration
        private readonly IEmailService _emailService; // Add IEmailService
        private readonly ILogger<EmployeeDetailsController> _logger; // Add ILogger

        public EmployeeDetailsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IConfiguration configuration,
            IEmailService emailService,
            ILogger<EmployeeDetailsController> logger)
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
                var employees = await _context.Employees
                    .Include(e => e.Branch)
                    .Include(e => e.EmployeeType)
                    .Select(e => new
                    {
                        e.EmpId,
                        Name = e.Name, 
                        e.ContactNo,
                        e.Status,
                        e.BranchId,
                        e.EmployeeTypeId,
                        e.UserId,
                        BranchName = e.Branch != null ? e.Branch.Name : "Unknown",
                        EmployeeTypeName = e.EmployeeType != null ? e.EmployeeType.Name : "Unknown",
                        e.Email,
                        e.Username,
                        e.Address,
                        e.DOB,
                        e.UserTypeId
                    })

                    .ToListAsync();
                _logger.LogInformation("Retrieved {Count} employees", employees.Count);
                return Ok(employees);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Index");
                return StatusCode(500, new { message = "An error occurred while retrieving employees." });
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

        [HttpGet("employee-types")]
        public async Task<IActionResult> GetEmployeeTypes()
        {
            try
            {
                var employeeTypes = await _context.EmployeeTypes
                    .Select(et => new { et.EmployeeTypeId, et.Name })
                    .ToListAsync();
                _logger.LogInformation("Retrieved {Count} employee types", employeeTypes.Count);
                return Ok(employeeTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetEmployeeTypes");
                return StatusCode(500, new { message = "An error occurred while retrieving employee types." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Employee employee)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Starting employee creation for username: {Username}", employee.Username);

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state: {Errors}", ModelState);
                    return BadRequest(ModelState);
                }

                // Validate foreign keys
                if (!await _context.EmployeeTypes.AnyAsync(et => et.EmployeeTypeId == employee.EmployeeTypeId))
                {
                    _logger.LogWarning("Invalid EmployeeTypeId: {EmployeeTypeId}", employee.EmployeeTypeId);
                    return BadRequest(new { message = "Invalid EmployeeTypeId." });
                }

                if (!await _context.Branches.AnyAsync(b => b.BranchId == employee.BranchId))
                {
                    _logger.LogWarning("Invalid BranchId: {BranchId}", employee.BranchId);
                    return BadRequest(new { message = "Invalid BranchId." });
                }

                // Check for existing user
                var existingUser = await _userManager.FindByEmailAsync(employee.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Email already exists: {Email}", employee.Email);
                    return BadRequest(new { message = "Email already exists." });
                }

                // Create ApplicationUser
                var user = new ApplicationUser
                {
                    UserName = employee.Username,
                    Email = employee.Email,
                    Name = employee.Name,
                    Address = employee.Address,
                    DOB = employee.DOB,
                    UserTypeId = employee.UserTypeId,
                    IsPasswordPending = true // Match UserAuthController behavior
                };

                // Generate temporary password
                var tempPassword = Guid.NewGuid().ToString() + "Ab1!";
                _logger.LogInformation("Creating ApplicationUser for username: {Username}", user.UserName);
                var result = await _userManager.CreateAsync(user, tempPassword);
                if (!result.Succeeded)
                {
                    _logger.LogError("Failed to create user: {Errors}", result.Errors);
                    return BadRequest(new { message = "Failed to create user.", errors = result.Errors });
                }

                // Assign role based on UserTypeId
                string role = employee.UserTypeId switch
                {
                    2 => "Clerk",
                    _ => "Customer"
                };
                _logger.LogInformation("Assigning role {Role} to user: {UserId}", role, user.Id);
                await _userManager.AddToRoleAsync(user, role);

                // Send welcome email with password reset link
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
                _logger.LogInformation("Sending welcome email to: {Email}", user.Email);
                await _emailService.SendAsync(user.Email, "Welcome to the System - Set Your Password", employeeWelcomeMessage);

                // Create Employee record
                employee.UserId = user.Id;
                _logger.LogInformation("Adding employee record for username: {Username}", employee.Username);
                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Employee saved successfully with EmpId: {EmpId}", employee.EmpId);

                await transaction.CommitAsync();
                return Ok(new { message = "Employee created successfully!", empId = employee.EmpId });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error in Create for username: {Username}", employee.Username);
                return StatusCode(500, new { message = "An error occurred while creating the employee.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Employee employee)
        {
            try
            {
                if (id != employee.EmpId)
                {
                    _logger.LogWarning("Employee ID mismatch: {Id} vs {EmpId}", id, employee.EmpId);
                    return BadRequest(new { message = "Employee ID mismatch." });
                }

                var existingEmployee = await _context.Employees
                    .Include(e => e.User)
                    .FirstOrDefaultAsync(e => e.EmpId == id);

                if (existingEmployee == null)
                {
                    _logger.LogWarning("Employee not found: {Id}", id);
                    return NotFound(new { message = "Employee not found." });
                }

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state: {Errors}", ModelState);
                    return BadRequest(ModelState);
                }

                // Validate foreign keys
                if (!await _context.EmployeeTypes.AnyAsync(et => et.EmployeeTypeId == employee.EmployeeTypeId))
                {
                    _logger.LogWarning("Invalid EmployeeTypeId: {EmployeeTypeId}", employee.EmployeeTypeId);
                    return BadRequest(new { message = "Invalid EmployeeTypeId." });
                }

                if (!await _context.Branches.AnyAsync(b => b.BranchId == employee.BranchId))
                {
                    _logger.LogWarning("Invalid BranchId: {BranchId}", employee.BranchId);
                    return BadRequest(new { message = "Invalid BranchId." });
                }

                // Update employee properties
                existingEmployee.Username = employee.Username;
                existingEmployee.Email = employee.Email;
                existingEmployee.Name = employee.Name;
                existingEmployee.Address = employee.Address;
                existingEmployee.DOB = employee.DOB;
                existingEmployee.UserTypeId = employee.UserTypeId;
                existingEmployee.ContactNo = employee.ContactNo;
                existingEmployee.Status = employee.Status;
                existingEmployee.BranchId = employee.BranchId;
                existingEmployee.EmployeeTypeId = employee.EmployeeTypeId;

                // Update associated user
                if (existingEmployee.User != null)
                {
                    existingEmployee.User.UserName = employee.Username;
                    existingEmployee.User.Email = employee.Email;
                    existingEmployee.User.Name = employee.Name;
                    existingEmployee.User.Address = employee.Address;
                    existingEmployee.User.DOB = employee.DOB;
                    existingEmployee.User.UserTypeId = employee.UserTypeId;
                    _context.Update(existingEmployee.User);
                }

                _context.Update(existingEmployee);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Employee updated successfully with EmpId: {EmpId}", existingEmployee.EmpId);

                return Ok(new { message = "Employee updated successfully!" });
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency error updating employee: {EmpId}", id);
                if (!EmployeeExists(id))
                    return NotFound(new { message = "Employee not found." });
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Update for employee: {EmpId}", id);
                return StatusCode(500, new { message = "An error occurred while updating the employee.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var employee = await _context.Employees
                    .Include(e => e.User)
                    .FirstOrDefaultAsync(e => e.EmpId == id);

                if (employee == null)
                {
                    _logger.LogWarning("Employee not found: {Id}", id);
                    return NotFound(new { message = "Employee not found." });
                }

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User not authenticated for delete: {Id}", id);
                    return Unauthorized(new { message = "User not authenticated." });
                }

                // Delete associated user if exists
                if (employee.User != null)
                {
                    _logger.LogInformation("Deleting ApplicationUser: {UserId}", employee.User.Id);
                    await _userManager.DeleteAsync(employee.User);
                }

                _logger.LogInformation("Deleting employee: {EmpId}", employee.EmpId);
                _context.Employees.Remove(employee);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Employee deleted successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Delete for employee: {Id}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the employee.", error = ex.Message });
            }
        }

        private bool EmployeeExists(int id)
        {
            return _context.Employees.Any(e => e.EmpId == id);
        }
    }
}