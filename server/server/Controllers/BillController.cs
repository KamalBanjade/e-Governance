using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DateConverterNepali;
using Microsoft.Extensions.Logging;

namespace e_Governance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BillsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<BillsController> _logger;

        // Static list of Nepali months for sorting
        private static readonly List<string> NEPALI_MONTHS = new List<string>
        {
            "Baisakh (बैशाख)", "Jestha (जेठ)", "Ashadh (असार)", "Shrawan (साउन)",
            "Bhadra (भदौ)", "Ashwin (असोज)", "Kartik (कार्तिक)", "Mangsir (मंसिर)",
            "Poush (पुष)", "Magh (माघ)", "Falgun (फागुन)", "Chaitra (चैत)"
        };

        public BillsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            ILogger<BillsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        private static readonly Dictionary<int, string> NepaliMonthsMap = new()
        {
            { 1, "Baisakh (बैशाख)" }, { 2, "Jestha (जेठ)" }, { 3, "Ashadh (असार)" },
            { 4, "Shrawan (साउन)" }, { 5, "Bhadra (भदौ)" }, { 6, "Ashwin (असोज)" },
            { 7, "Kartik (कार्तिक)" }, { 8, "Mangsir (मंसिर)" }, { 9, "Poush (पुष)" },
            { 10, "Magh (माघ)" }, { 11, "Falgun (फागुन)" }, { 12, "Chaitra (चैत)" }
        };

        private static (string Month, int Year, int Day) GetExactNepaliDate(DateTime gregorianDate)
        {
            try
            {
                var nepaliDate = DateConverter.GetDateInBS(gregorianDate);
                var nepaliMonth = nepaliDate.nepaliMonthInEnglishFont ?? "Baisakh";
                var nepaliYear = nepaliDate.npYear;
                var nepaliDay = nepaliDate.npDay;
                return (nepaliMonth, nepaliYear, nepaliDay);
            }
            catch (Exception)
            {
                var approximateResult = GetNepaliMonthAndYear(gregorianDate);
                int approximateDay = gregorianDate.Day;
                if (approximateDay > 30) approximateDay = 30;
                return (approximateResult.Month, approximateResult.Year, approximateDay);
            }
        }

        private static (string Month, int Year) GetNepaliMonthAndYear(DateTime gregorianDate)
        {
            var nepaliYear = gregorianDate.Year + 57;
            var monthIndex = gregorianDate.Month - 1;
            if (monthIndex < 0) monthIndex = 0;
            if (monthIndex >= NEPALI_MONTHS.Count) monthIndex = NEPALI_MONTHS.Count - 1;
            var nepaliMonth = NEPALI_MONTHS[monthIndex];
            return (nepaliMonth, nepaliYear);
        }

        private static int GetMonthNumber(string? monthName)
        {
            if (string.IsNullOrEmpty(monthName))
                return 1;
            var index = NEPALI_MONTHS.IndexOf(monthName);
            return index >= 0 ? index + 1 : 1;
        }

        [HttpPost]
        public async Task<IActionResult> CreateBill([FromBody] Bill bill)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state for bill creation");
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Creating bill for customer ID: {CusId} by user: {UserId}", bill.CusId, userId);

                var customer = await _context.Customers.FindAsync(bill.CusId);
                if (customer == null)
                {
                    _logger.LogWarning("Invalid customer ID: {CusId}", bill.CusId);
                    return BadRequest(new { message = "Invalid customer ID." });
                }

                bill.ConsumedUnit = bill.CurrentReading - bill.PreviousReading;
                bill.TotalBillAmount = bill.MinimumCharge + (bill.ConsumedUnit * bill.Rate);

                var currentDate = DateTime.UtcNow;
                var nepaliDateResult = GetExactNepaliDate(currentDate);

                bill.CreatedDate = currentDate;
                bill.CreatedDateNepali = $"{nepaliDateResult.Year}-{nepaliDateResult.Day:D2}-{GetMonthNumber(nepaliDateResult.Month):D2}";
                bill.CreatedMonthNepali = nepaliDateResult.Month;
                bill.CreatedYearNepali = nepaliDateResult.Year;
                bill.CreatedDayNepali = nepaliDateResult.Day;
                bill.CreatedBy = userId;
                bill.Status = "Pending";

                _context.Bills.Add(bill);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Bill created successfully with ID: {BillNo}", bill.BillNo);

                return Ok(new
                {
                    message = "Bill created successfully!",
                    billId = bill.BillNo,
                    createdDateNepali = $"{nepaliDateResult.Year}/{GetMonthNumber(nepaliDateResult.Month):D2}/{nepaliDateResult.Day:D2} ({nepaliDateResult.Month})",
                    createdDateNepaliFormatted = bill.CreatedDateNepali
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating bill for customer ID: {CusId}", bill.CusId);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllBills()
        {
            try
            {
                _logger.LogInformation("Fetching all bills");

                var bills = await _context.Bills
                    .Include(b => b.Customer)
                    .ToListAsync();

                var sortedBills = bills
                    .OrderByDescending(b => b.CreatedYearNepali)
                    .ThenByDescending(b => NEPALI_MONTHS.IndexOf(b.CreatedMonthNepali ?? "Baisakh"))
                    .ThenByDescending(b => b.CreatedDayNepali)
                    .ToList();

                var billsResponse = sortedBills.Select(b => new
                {
                    b.BillNo,
                    b.CusId,
                    Customer = b.Customer != null ? new
                    {
                        b.Customer.CusId,
                        Name = b.Customer.Name ?? "Unknown",
                        Address = b.Customer.Address ?? ""
                    } : null,
                    b.BillDate,
                    b.BillMonth,
                    b.BillYear,
                    b.PreviousReading,
                    b.CurrentReading,
                    b.ConsumedUnit,
                    b.MinimumCharge,
                    b.Rate,
                    b.TotalBillAmount,
                    b.Status,
                    b.CreatedDate,
                    b.CreatedDateNepali,
                    b.CreatedMonthNepali,
                    b.CreatedYearNepali,
                    b.CreatedDayNepali,
                    CreatedDateNepaliFormatted = b.CreatedYearNepali != null && b.CreatedMonthNepali != null && b.CreatedDayNepali != null
                        ? $"{b.CreatedYearNepali}/{GetMonthNumber(b.CreatedMonthNepali):D2}/{b.CreatedDayNepali:D2} ({b.CreatedMonthNepali})"
                        : null,
                    b.CreatedBy,
                    b.UpdatedDate,
                    b.UpdatedDateNepali,
                    b.UpdatedMonthNepali,
                    b.UpdatedYearNepali,
                    b.UpdatedDayNepali,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(b.UpdatedDateNepali) && b.UpdatedYearNepali != null && b.UpdatedMonthNepali != null && b.UpdatedDayNepali != null
                        ? $"{b.UpdatedYearNepali}/{GetMonthNumber(b.UpdatedMonthNepali):D2}/{b.UpdatedDayNepali:D2} ({b.UpdatedMonthNepali})"
                        : null,
                    b.UpdatedBy
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} bills", billsResponse.Count);
                return Ok(billsResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all bills: {Message}", ex.Message);
                return StatusCode(500, new { message = "Server error", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("by-current-user")]
        [Authorize(Roles = "Clerk")]
        public async Task<IActionResult> GetBillsByCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Fetching bills created by user: {UserId}", userId);

                var bills = await _context.Bills
                    .Include(b => b.Customer)
                    .Where(b => b.CreatedBy == userId)
                    .ToListAsync();

                var sortedBills = bills
                    .OrderByDescending(b => b.CreatedYearNepali)
                    .ThenByDescending(b => NEPALI_MONTHS.IndexOf(b.CreatedMonthNepali ?? "Baisakh"))
                    .ThenByDescending(b => b.CreatedDayNepali)
                    .ToList();

                var billsResponse = sortedBills.Select(b => new
                {
                    b.BillNo,
                    b.CusId,
                    Customer = b.Customer != null ? new
                    {
                        b.Customer.CusId,
                        Name = b.Customer.Name ?? "Unknown",
                        Address = b.Customer.Address ?? ""
                    } : null,
                    b.BillDate,
                    b.BillMonth,
                    b.BillYear,
                    b.PreviousReading,
                    b.CurrentReading,
                    b.ConsumedUnit,
                    b.MinimumCharge,
                    b.Rate,
                    b.TotalBillAmount,
                    b.Status,
                    b.CreatedDate,
                    b.CreatedDateNepali,
                    b.CreatedMonthNepali,
                    b.CreatedYearNepali,
                    b.CreatedDayNepali,
                    CreatedDateNepaliFormatted = b.CreatedYearNepali != null && b.CreatedMonthNepali != null && b.CreatedDayNepali != null
                        ? $"{b.CreatedYearNepali}/{GetMonthNumber(b.CreatedMonthNepali):D2}/{b.CreatedDayNepali:D2} ({b.CreatedMonthNepali})"
                        : null,
                    b.CreatedBy,
                    b.UpdatedDate,
                    b.UpdatedDateNepali,
                    b.UpdatedMonthNepali,
                    b.UpdatedYearNepali,
                    b.UpdatedDayNepali,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(b.UpdatedDateNepali) && b.UpdatedYearNepali != null && b.UpdatedMonthNepali != null && b.UpdatedDayNepali != null
                        ? $"{b.UpdatedYearNepali}/{GetMonthNumber(b.UpdatedMonthNepali):D2}/{b.UpdatedDayNepali:D2} ({b.UpdatedMonthNepali})"
                        : null,
                    b.UpdatedBy
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} bills created by user: {UserId}", billsResponse.Count, userId);
                return Ok(billsResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching bills for current user: {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("by-branch")]
        public async Task<IActionResult> GetBillsByBranch([FromQuery] int branchId)
        {
            try
            {
                _logger.LogInformation("Fetching bills for branch: {BranchId}", branchId);

                // Use RegisteredBranchId instead of BranchId
                var bills = await _context.Bills
                    .Include(b => b.Customer)
                    .Where(b => b.Customer != null && b.Customer.RegisteredBranchId == branchId)
                    .ToListAsync();

                var sortedBills = bills
                    .OrderByDescending(b => b.CreatedYearNepali)
                    .ThenByDescending(b => NEPALI_MONTHS.IndexOf(b.CreatedMonthNepali ?? "Baisakh"))
                    .ThenByDescending(b => b.CreatedDayNepali)
                    .ToList();

                var billsResponse = sortedBills.Select(b => new
                {
                    b.BillNo,
                    b.CusId,
                    Customer = b.Customer != null ? new
                    {
                        b.Customer.CusId,
                        Name = b.Customer.Name ?? "Unknown",
                        Address = b.Customer.Address ?? "",
                        BranchId = b.Customer.RegisteredBranchId
                    } : null,
                    b.BillDate,
                    b.BillMonth,
                    b.BillYear,
                    b.PreviousReading,
                    b.CurrentReading,
                    b.ConsumedUnit,
                    b.MinimumCharge,
                    b.Rate,
                    b.TotalBillAmount,
                    b.Status,
                    b.CreatedDate,
                    b.CreatedDateNepali,
                    b.CreatedMonthNepali,
                    b.CreatedYearNepali,
                    b.CreatedDayNepali,
                    CreatedDateNepaliFormatted = b.CreatedYearNepali != null && b.CreatedMonthNepali != null && b.CreatedDayNepali != null
                        ? $"{b.CreatedYearNepali}/{GetMonthNumber(b.CreatedMonthNepali):D2}/{b.CreatedDayNepali:D2} ({b.CreatedMonthNepali})"
                        : null,
                    b.CreatedBy,
                    b.UpdatedDate,
                    b.UpdatedDateNepali,
                    b.UpdatedMonthNepali,
                    b.UpdatedYearNepali,
                    b.UpdatedDayNepali,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(b.UpdatedDateNepali) && b.UpdatedYearNepali != null && b.UpdatedMonthNepali != null && b.UpdatedDayNepali != null
                        ? $"{b.UpdatedYearNepali}/{GetMonthNumber(b.UpdatedMonthNepali):D2}/{b.UpdatedDayNepali:D2} ({b.UpdatedMonthNepali})"
                        : null,
                    b.UpdatedBy
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} bills for branch {BranchId}", billsResponse.Count, branchId);
                return Ok(billsResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching bills for branch {BranchId}: {Message}", branchId, ex.Message);
                return StatusCode(500, new { message = "Server error", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("customer-bills")]
        public async Task<IActionResult> GetCustomerBills()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Fetching bills for user: {UserId}", userId);

                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (customer == null)
                {
                    _logger.LogWarning("Customer not found for user: {UserId}", userId);
                    return NotFound(new { message = "Customer record not found for this user." });
                }

                var bills = await _context.Bills
                    .Where(b => b.CusId == customer.CusId)
                    .OrderByDescending(b => b.CreatedYearNepali)
                    .ThenByDescending(b => NEPALI_MONTHS.IndexOf(b.CreatedMonthNepali ?? "Baisakh"))
                    .ThenByDescending(b => b.CreatedDayNepali)
                    .ToListAsync();

                var billsResponse = bills.Select(b => new
                {
                    b.BillNo,
                    b.CusId,
                    b.BillDate,
                    b.BillMonth,
                    b.BillYear,
                    b.PreviousReading,
                    b.CurrentReading,
                    b.ConsumedUnit,
                    b.MinimumCharge,
                    b.Rate,
                    b.TotalBillAmount,
                    b.Status,
                    b.CreatedDate,
                    b.CreatedDateNepali,
                    CreatedDateNepaliFormatted = $"{b.CreatedYearNepali}/{GetMonthNumber(b.CreatedMonthNepali):D2}/{b.CreatedDayNepali:D2} ({b.CreatedMonthNepali})",
                    b.CreatedBy,
                    b.UpdatedDate,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(b.UpdatedDateNepali)
                        ? $"{b.UpdatedYearNepali}/{GetMonthNumber(b.UpdatedMonthNepali):D2}/{b.UpdatedDayNepali:D2} ({b.UpdatedMonthNepali})"
                        : null,
                    b.UpdatedBy
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} bills for customer: {CusId}", billsResponse.Count, customer.CusId);
                return Ok(billsResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer bills for user: {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Clerk")]
        public async Task<IActionResult> UpdateBill(int id, [FromBody] Bill bill)
        {
            try
            {
                if (id != bill.BillNo)
                {
                    _logger.LogWarning("Bill ID mismatch: URL ID {UrlId} vs Body ID {BodyId}", id, bill.BillNo);
                    return BadRequest(new { message = "Bill ID mismatch." });
                }

                _logger.LogInformation("Updating bill ID: {BillId}", id);

                var existingBill = await _context.Bills.FindAsync(id);
                if (existingBill == null)
                {
                    _logger.LogWarning("Bill not found: {BillId}", id);
                    return NotFound(new { message = "Bill not found." });
                }

                existingBill.BillDate = bill.BillDate;
                existingBill.BillMonth = bill.BillMonth;
                existingBill.BillYear = bill.BillYear;
                existingBill.PreviousReading = bill.PreviousReading;
                existingBill.CurrentReading = bill.CurrentReading;
                existingBill.MinimumCharge = bill.MinimumCharge;
                existingBill.Rate = bill.Rate;
                existingBill.Status = bill.Status;

                existingBill.ConsumedUnit = existingBill.CurrentReading - existingBill.PreviousReading;
                existingBill.TotalBillAmount = existingBill.MinimumCharge + (existingBill.ConsumedUnit * existingBill.Rate);

                var currentDate = DateTime.UtcNow;
                var nepaliDateResult = GetExactNepaliDate(currentDate);

                existingBill.UpdatedDate = currentDate;
                existingBill.UpdatedDateNepali = $"{nepaliDateResult.Year}-{nepaliDateResult.Day:D2}-{GetMonthNumber(nepaliDateResult.Month):D2}";
                existingBill.UpdatedMonthNepali = nepaliDateResult.Month;
                existingBill.UpdatedYearNepali = nepaliDateResult.Year;
                existingBill.UpdatedDayNepali = nepaliDateResult.Day;
                existingBill.UpdatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Bill updated successfully: {BillId}", id);

                return Ok(new
                {
                    message = "Bill updated successfully!",
                    updatedDateNepali = $"{nepaliDateResult.Year}/{GetMonthNumber(nepaliDateResult.Month):D2}/{nepaliDateResult.Day:D2} ({nepaliDateResult.Month})"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating bill ID: {BillId}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBill(int id)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Fetching bill ID: {BillId}", id);

                var bill = await _context.Bills
                    .Include(b => b.Customer)
                    .FirstOrDefaultAsync(b => b.BillNo == id);

                if (bill == null)
                {
                    _logger.LogWarning("Bill not found: {BillId}", id);
                    return NotFound(new { message = "Bill not found." });
                }

                if (User.IsInRole("Customer"))
                {
                    var customer = await _context.Customers
                        .FirstOrDefaultAsync(c => c.UserId == userId);

                    if (customer == null || bill.CusId != customer.CusId)
                    {
                        _logger.LogWarning("Unauthorized bill access attempt by user: {UserId} for bill: {BillId}", userId, id);
                        return Forbid("You can only access your own bills.");
                    }
                }

                var billResponse = new
                {
                    bill.BillNo,
                    bill.CusId,
                    bill.Customer,
                    bill.BillDate,
                    bill.BillMonth,
                    bill.BillYear,
                    bill.PreviousReading,
                    bill.CurrentReading,
                    bill.ConsumedUnit,
                    bill.MinimumCharge,
                    bill.Rate,
                    bill.TotalBillAmount,
                    bill.Status,
                    bill.CreatedDate,
                    bill.CreatedDateNepali,
                    CreatedDateNepaliFormatted = $"{bill.CreatedYearNepali}/{GetMonthNumber(bill.CreatedMonthNepali):D2}/{bill.CreatedDayNepali:D2} ({bill.CreatedMonthNepali})",
                    bill.CreatedBy,
                    bill.UpdatedDate,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(bill.UpdatedDateNepali)
                        ? $"{bill.UpdatedYearNepali}/{GetMonthNumber(bill.UpdatedMonthNepali):D2}/{bill.UpdatedDayNepali:D2} ({bill.UpdatedMonthNepali})"
                        : null,
                    bill.UpdatedBy
                };

                _logger.LogInformation("Successfully fetched bill ID: {BillId}", id);
                return Ok(billResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching bill ID: {BillId}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBill(int id)
        {
            try
            {
                _logger.LogInformation("Deleting bill ID: {BillId}", id);

                var bill = await _context.Bills.FindAsync(id);
                if (bill == null)
                {
                    _logger.LogWarning("Bill not found for deletion: {BillId}", id);
                    return NotFound(new { message = "Bill not found." });
                }

                _context.Bills.Remove(bill);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Bill deleted successfully: {BillId}", id);
                return Ok(new { message = "Bill deleted successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting bill ID: {BillId}", id);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpPost("mark-overdue")]
        public async Task<IActionResult> MarkOverdueBills()
        {
            try
            {
                _logger.LogInformation("Marking overdue bills");

                var overdueBills = await _context.Bills
                    .Where(b => b.Status == "Pending" && b.BillDate.AddDays(30) < DateTime.UtcNow)
                    .ToListAsync();

                foreach (var bill in overdueBills)
                {
                    bill.Status = "Overdue";
                    var currentDate = DateTime.UtcNow;
                    var nepaliDateResult = GetExactNepaliDate(currentDate);
                    bill.UpdatedDate = currentDate;
                    bill.UpdatedDateNepali = $"{nepaliDateResult.Year}-{nepaliDateResult.Day:D2}-{GetMonthNumber(nepaliDateResult.Month):D2}";
                    bill.UpdatedMonthNepali = nepaliDateResult.Month;
                    bill.UpdatedYearNepali = nepaliDateResult.Year;
                    bill.UpdatedDayNepali = nepaliDateResult.Day;
                    bill.UpdatedBy = "System";
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Marked {Count} bills as overdue", overdueBills.Count);
                return Ok(new { message = $"Marked {overdueBills.Count} overdue bills updated." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking overdue bills");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("customer-bills-with-details")]
        public async Task<IActionResult> GetCustomerBillsWithDetails()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt: User not authenticated");
                    return Unauthorized(new { message = "User not authenticated." });
                }

                _logger.LogInformation("Fetching bills with details for user: {UserId}", userId);

                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (customer == null)
                {
                    _logger.LogWarning("Customer not found for user: {UserId}", userId);
                    return NotFound(new { message = "Customer record not found for this user." });
                }

                var bills = await _context.Bills
                    .Where(b => b.CusId == customer.CusId)
                    .Include(b => b.Customer)
                    .ToListAsync();

                var sortedBills = bills
                    .OrderByDescending(b => b.CreatedYearNepali)
                    .ThenByDescending(b => NEPALI_MONTHS.IndexOf(b.CreatedMonthNepali ?? "Baisakh"))
                    .ThenByDescending(b => b.CreatedDayNepali)
                    .ToList();

                var billsResponse = sortedBills.Select(b => new
                {
                    b.BillNo,
                    b.CusId,
                    Customer = b.Customer != null ? new
                    {
                        b.Customer.CusId,
                        Name = b.Customer.Name ?? "Unknown",
                        Address = b.Customer.Address ?? ""
                    } : new { CusId = b.CusId, Name = "Unknown", Address = "" },
                    b.BillDate,
                    b.BillMonth,
                    b.BillYear,
                    b.PreviousReading,
                    b.CurrentReading,
                    b.ConsumedUnit,
                    b.MinimumCharge,
                    b.Rate,
                    b.TotalBillAmount,
                    b.Status,
                    b.CreatedDate,
                    b.CreatedDateNepali,
                    b.CreatedMonthNepali,
                    b.CreatedYearNepali,
                    b.CreatedDayNepali,
                    CreatedDateNepaliFormatted = b.CreatedYearNepali != null && b.CreatedMonthNepali != null && b.CreatedDayNepali != null
                        ? $"{b.CreatedYearNepali}/{GetMonthNumber(b.CreatedMonthNepali):D2}/{b.CreatedDayNepali:D2} ({b.CreatedMonthNepali})"
                        : null,
                    b.CreatedBy,
                    b.UpdatedDate,
                    b.UpdatedDateNepali,
                    b.UpdatedMonthNepali,
                    b.UpdatedYearNepali,
                    b.UpdatedDayNepali,
                    UpdatedDateNepaliFormatted = !string.IsNullOrEmpty(b.UpdatedDateNepali) && b.UpdatedYearNepali != null && b.UpdatedMonthNepali != null && b.UpdatedDayNepali != null
                        ? $"{b.UpdatedYearNepali}/{GetMonthNumber(b.UpdatedMonthNepali):D2}/{b.UpdatedDayNepali:D2} ({b.UpdatedMonthNepali})"
                        : null,
                    b.UpdatedBy
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} bills for customer: {CusId}", billsResponse.Count, customer.CusId);
                return Ok(new
                {
                    customer = new
                    {
                        customer.CusId,
                        Name = customer.Name ?? "Unknown",
                        Address = customer.Address ?? ""
                    },
                    bills = billsResponse
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer bills for user: {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "Server error", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("current-nepali-date")]
        public IActionResult GetCurrentNepaliDate()
        {
            try
            {
                _logger.LogInformation("Fetching current Nepali date");

                var currentDate = DateTime.UtcNow;
                var nepaliDate = DateConverter.GetDateInBS(currentDate);
                var monthWithNepali = GetMonthWithNepaliScript(nepaliDate.nepaliMonthInEnglishFont ?? "Baisakh");

                var response = new
                {
                    year = nepaliDate.npYear,
                    month = monthWithNepali,
                    day = nepaliDate.npDay,
                    formatted = $"{nepaliDate.npYear}/{nepaliDate.npMonth:D2}/{nepaliDate.npDay:D2} ({monthWithNepali})"
                };

                _logger.LogInformation("Successfully fetched current Nepali date: {Formatted}", response.formatted);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching current Nepali date");
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        private string GetMonthWithNepaliScript(string englishMonth)
        {
            var monthMapping = new Dictionary<string, string>
            {
                { "Baisakh", "Baisakh (बैशाख)" },
                { "Jestha", "Jestha (जेठ)" },
                { "Ashadh", "Ashadh (असार)" },
                { "Shrawan", "Shrawan (साउन)" },
                { "Bhadra", "Bhadra (भदौ)" },
                { "Ashwin", "Ashwin (असोज)" },
                { "Kartik", "Kartik (कार्तिक)" },
                { "Mangsir", "Mangsir (मंसिर)" },
                { "Poush", "Poush (पुष)" },
                { "Magh", "Magh (माघ)" },
                { "Falgun", "Falgun (फागुन)" },
                { "Chaitra", "Chaitra (चैत)" }
            };
            return monthMapping.ContainsKey(englishMonth) ? monthMapping[englishMonth] : "Baisakh (बैशाख)";
        }
    }

    [Authorize]
    [Route("api/branches")]
    [ApiController]
    public class BranchesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BranchesController> _logger;

        public BranchesController(ApplicationDbContext context, ILogger<BranchesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllBranches()
        {
            try
            {
                _logger.LogInformation("Fetching all branches");

                var branches = await _context.Branches
                    .Select(b => new
                    {
                        branchId = b.BranchId,
                        name = b.Name
                    })
                    .ToListAsync();

                _logger.LogInformation("Successfully fetched {Count} branches", branches.Count);
                return Ok(branches);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all branches: {Message}", ex.Message);
                return StatusCode(500, new { message = "Server error", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }
    }
}