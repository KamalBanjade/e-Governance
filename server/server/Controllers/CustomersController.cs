using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DateConverterNepali;

namespace e_Governance.Controllers
{
    [Authorize(Roles = "Admin,Clerk,Customer")]
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<CustomersController> _logger;

        // Static list of Nepali months for sorting
        private static readonly List<string> NEPALI_MONTHS = new List<string>
        {
            "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
            "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
        };

        public CustomersController(
            ApplicationDbContext context,
            IWebHostEnvironment webHostEnvironment,
            UserManager<ApplicationUser> userManager,
            ILogger<CustomersController> logger)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
            _userManager = userManager;
            _logger = logger;
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches()
        {
            try
            {
                _logger.LogInformation("Fetching active branches");
                var branches = await _context.Branches
                    .Where(b => b.Status == "Active")
                    .Select(b => new { b.BranchId, b.Name })
                    .ToListAsync();
                _logger.LogInformation("Successfully fetched {Count} branches", branches.Count);
                return Ok(branches);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching branches");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("demandtypes")]
        public async Task<IActionResult> GetDemandTypes()
        {
            try
            {
                _logger.LogInformation("Fetching active demand types");
                var demandTypes = await _context.DemandTypes
                    .Where(d => d.Status == "Active")
                    .Select(d => new { d.DemandTypeId, d.Name, d.Description })
                    .ToListAsync();
                _logger.LogInformation("Successfully fetched {Count} demand types", demandTypes.Count);
                return Ok(demandTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demand types");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("by-user")]
        public async Task<IActionResult> GetCustomerByUser()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Fetching customer for user ID: {UserId}", userId);
                var customer = await _context.Customers
                    .Include(c => c.RegisteredBranch)
                    .Include(c => c.DemandType)
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (customer == null)
                {
                    _logger.LogInformation("Customer not found for user ID: {UserId}", userId);
                    return NotFound(new { message = "Customer record not found for this user." });
                }

                _logger.LogInformation("Successfully fetched customer for user ID: {UserId}", userId);
                return Ok(customer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer by user");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("profile-status")]
        public async Task<IActionResult> GetProfileStatus()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Checking profile status for user ID: {UserId}", userId);
                var customerExists = await _context.Customers
                    .AnyAsync(c => c.UserId == userId);
                _logger.LogInformation("Profile status for user ID: {UserId} - Exists: {Exists}", userId, customerExists);
                return Ok(new { hasCustomerProfile = customerExists });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking profile status");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        private static readonly Dictionary<int, string> NepaliMonthsMap = new()
        {
            { 1, "Baisakh" }, { 2, "Jestha" }, { 3, "Ashadh" }, { 4, "Shrawan" },
            { 5, "Bhadra" }, { 6, "Ashwin" }, { 7, "Kartik" }, { 8, "Mangsir" },
            { 9, "Poush" }, { 10, "Magh" }, { 11, "Falgun" }, { 12, "Chaitra" }
        };

        private static (string Month, int Year, int Day) GetExactNepaliDate(DateTime gregorianDate)
        {
            try
            {
                // Using DateConverterNepali library
                var nepaliDate = DateConverter.GetDateInBS(gregorianDate);

                var nepaliMonth = nepaliDate.nepaliMonthInEnglishFont;
                var nepaliYear = nepaliDate.npYear;
                var nepaliDay = nepaliDate.npDay;

                return (nepaliMonth, nepaliYear, nepaliDay);
            }
            catch (Exception)
            {
                // Fallback to approximate conversion if DateConverterNepali fails
                var approximateResult = GetNepaliMonthAndYear(gregorianDate);
                int approximateDay = gregorianDate.Day;
                if (approximateDay > 30) approximateDay = 30; // Nepali months typically have 29-32 days

                return (approximateResult.Month, approximateResult.Year, approximateDay);
            }
        }

        private static (string Month, int Year) GetNepaliMonthAndYear(DateTime gregorianDate)
        {
            // Approximate Nepali date conversion (BS = AD + 57 years approximately)
            var nepaliYear = gregorianDate.Year + 57;

            // Simple month mapping based on Gregorian calendar
            var monthIndex = gregorianDate.Month - 1;
            if (monthIndex < 0) monthIndex = 0;
            if (monthIndex >= NEPALI_MONTHS.Count) monthIndex = NEPALI_MONTHS.Count - 1;

            var nepaliMonth = NEPALI_MONTHS[monthIndex];

            return (nepaliMonth, nepaliYear);
        }

        [HttpPost("complete-profile")]
        public async Task<IActionResult> CompleteProfile([FromForm] CustomerProfileViewModel model)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Completing profile for user ID: {UserId}", userId);
                var existingCustomer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (existingCustomer != null)
                {
                    _logger.LogWarning("Profile already exists for user ID: {UserId}", userId);
                    return BadRequest(new { message = "Customer profile already exists." });
                }

                if (string.IsNullOrEmpty(model.SCNo) || string.IsNullOrEmpty(model.MobileNo) ||
                    string.IsNullOrEmpty(model.CitizenshipNo) || model.DemandTypeId <= 0 ||
                    model.RegisteredBranchId <= 0)
                {
                    _logger.LogWarning("Invalid profile data for user ID: {UserId}", userId);
                    return BadRequest(new { message = "All required fields must be filled." });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User not found for ID: {UserId}", userId);
                    return BadRequest(new { message = "User not found." });
                }

                var registrationDate = DateTime.Now;
                var nepaliDateResult = GetExactNepaliDate(DateTime.Now);
                string month = nepaliDateResult.Month;
                int year = nepaliDateResult.Year;

                var customer = new Customer
                {
                    SCNo = model.SCNo,
                    Name = user.Name ?? "Unknown",
                    Address = user.Address ?? "Unknown",
                    DOB = user.DOB ?? DateTime.Now,
                    MobileNo = model.MobileNo,
                    CitizenshipNo = model.CitizenshipNo,
                    DemandTypeId = model.DemandTypeId,
                    RegisteredBranchId = model.RegisteredBranchId,
                    UserId = userId,
                    RegistrationMonth = month ?? "Baisakh",
                    RegistrationYear = year > 0 ? year : DateTime.Now.Year + 57
                };

                if (Request.Form.Files.Count > 0)
                {
                    var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "Uploads");
                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);

                    foreach (var formFile in Request.Form.Files)
                    {
                        if (formFile.Length > 0)
                        {
                            var fileName = $"{Guid.NewGuid()}_{formFile.FileName}";
                            var filePath = Path.Combine(uploadsFolder, fileName);

                            using var stream = new FileStream(filePath, FileMode.Create);
                            await formFile.CopyToAsync(stream);

                            if (formFile.Name == "CitizenshipFile")
                                customer.CitizenshipPath = $"/Uploads/{fileName}";
                            if (formFile.Name == "HouseFile")
                                customer.HouseDetailsPath = $"/Uploads/{fileName}";
                        }
                    }
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Customer profile completed successfully for user ID: {UserId}", userId);
                return Ok(new { message = "Customer profile completed successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing profile for user");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] Customer customer)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state for customer creation");
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Creating customer for user ID: {UserId}", userId);
                customer.UserId = userId;

                var registrationDate = DateTime.Now;
                var nepaliDateResult = GetExactNepaliDate(registrationDate); // Changed from GetNepaliMonthAndYear
                string month = nepaliDateResult.Month;
                int year = nepaliDateResult.Year;

                customer.RegistrationMonth = month ?? "Baisakh";
                customer.RegistrationYear = year > 0 ? year : DateTime.Now.Year + 57;

                if (Request.Form.Files.Count > 0)
                {
                    var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "Uploads");
                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);

                    foreach (var formFile in Request.Form.Files)
                    {
                        if (formFile.Length > 0)
                        {
                            var fileName = $"{Guid.NewGuid()}_{formFile.FileName}";
                            var filePath = Path.Combine(uploadsFolder, fileName);

                            using var stream = new FileStream(filePath, FileMode.Create);
                            await formFile.CopyToAsync(stream);

                            if (formFile.Name == "CitizenshipFile")
                                customer.CitizenshipPath = $"/Uploads/{fileName}";
                            if (formFile.Name == "HouseFile")
                                customer.HouseDetailsPath = $"/Uploads/{fileName}";
                        }
                    }
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Customer created successfully for user ID: {UserId}", userId);
                return Ok(new { message = "Customer created successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating customer");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            try
            {
                _logger.LogInformation("Fetching all customers");
                var customers = await _context.Customers
                    .Include(c => c.RegisteredBranch)
                    .Include(c => c.DemandType)
                    .ToListAsync();
                _logger.LogInformation("Successfully fetched {Count} customers", customers.Count);
                return Ok(customers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customers");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Customer updatedCustomer)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state for customer update, ID: {Id}", id);
                    return BadRequest(ModelState);
                }

                _logger.LogInformation("Updating customer ID: {Id}", id);
                var customer = await _context.Customers.FindAsync(id);
                if (customer == null)
                {
                    _logger.LogWarning("Customer not found, ID: {Id}", id);
                    return NotFound(new { message = "Customer not found." });
                }

                customer.SCNo = updatedCustomer.SCNo;
                customer.Name = updatedCustomer.Name;
                customer.Address = updatedCustomer.Address;
                customer.DOB = updatedCustomer.DOB;
                customer.MobileNo = updatedCustomer.MobileNo;
                customer.CitizenshipNo = updatedCustomer.CitizenshipNo;
                customer.DemandTypeId = updatedCustomer.DemandTypeId;
                customer.RegisteredBranchId = updatedCustomer.RegisteredBranchId;

                _context.Customers.Update(customer);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Customer updated successfully, ID: {Id}", id);
                return Ok(new { message = "Customer updated successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating customer ID: {Id}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                _logger.LogInformation("Deleting customer ID: {Id}", id);
                var customer = await _context.Customers.FindAsync(id);
                if (customer == null)
                {
                    _logger.LogWarning("Customer not found, ID: {Id}", id);
                    return NotFound(new { message = "Customer not found." });
                }

                _context.Customers.Remove(customer);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Customer deleted successfully, ID: {Id}", id);
                return Ok(new { message = "Customer deleted successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting customer ID: {Id}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetCustomerById(int id)
        {
            try
            {
                _logger.LogInformation("Fetching customer ID: {Id}", id);
                var customer = await _context.Customers
                    .Include(c => c.RegisteredBranch)
                    .Include(c => c.DemandType)
                    .FirstOrDefaultAsync(c => c.CusId == id);

                if (customer == null)
                {
                    _logger.LogWarning("Customer not found, ID: {Id}", id);
                    return NotFound(new { message = $"Customer with ID {id} not found." });
                }

                _logger.LogInformation("Successfully fetched customer ID: {Id}", id);
                return Ok(customer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer ID: {Id}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("registrations-by-month")]
        public async Task<IActionResult> GetRegistrationsByMonth()
        {
            try
            {
                _logger.LogInformation("Fetching registrations by month");

                var registrations = await _context.Customers
                    .Where(c => !string.IsNullOrEmpty(c.RegistrationMonth))
                    .GroupBy(c => new { c.RegistrationMonth, c.RegistrationYear })
                    .Select(g => new
                    {
                        Month = g.Key.RegistrationMonth,
                        Year = g.Key.RegistrationYear,
                        NewCustomers = g.Count()
                    })
                    .ToListAsync();

                // Sort the results properly
                var sortedRegistrations = registrations
                    .OrderBy(x => x.Year)
                    .ThenBy(x => NEPALI_MONTHS.IndexOf(x.Month))
                    .ToList();

                _logger.LogInformation("Successfully fetched {Count} registration records", sortedRegistrations.Count);
                return Ok(sortedRegistrations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching registrations by month");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }
    }

    public class CustomerProfileViewModel
    {
        public string SCNo { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
        public string CitizenshipNo { get; set; } = string.Empty;
        public int DemandTypeId { get; set; }
        public int RegisteredBranchId { get; set; }
    }
}