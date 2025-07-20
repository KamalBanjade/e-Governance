using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace e_Governance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BillsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public BillsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpPost]
        public async Task<IActionResult> CreateBill([FromBody] Bill bill)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            var customer = await _context.Customers.FindAsync(bill.CusId);
            if (customer == null)
                return BadRequest(new { message = "Invalid customer ID." });

            bill.ConsumedUnit = bill.CurrentReading - bill.PreviousReading;
            bill.TotalBillAmount = bill.MinimumCharge + (bill.ConsumedUnit * bill.Rate);
            bill.CreatedDate = DateTime.UtcNow;
            bill.CreatedBy = userId;
            bill.Status = "Pending"; // Set default status

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Bill created successfully!", billId = bill.BillNo });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllBills()
        {
            var bills = await _context.Bills
                .Include(b => b.Customer)
                .OrderByDescending(b => b.CreatedDate)
                .ToListAsync();

            return Ok(bills);
        }

        [HttpGet("customer-bills")]
        public async Task<IActionResult> GetCustomerBills()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (customer == null)
                return NotFound(new { message = "Customer record not found for this user." });

            var bills = await _context.Bills
                .Where(b => b.CusId == customer.CusId)
                .OrderByDescending(b => b.BillYear)
                .ThenByDescending(b => b.BillMonth)
                .ThenByDescending(b => b.BillDate)
                .ToListAsync();

            return Ok(bills);
        }

        [HttpGet("customer-bills-with-details")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> GetCustomerBillsWithDetails()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (customer == null)
                return NotFound(new { message = "Customer record not found for this user." });

            var bills = await _context.Bills
                .Include(b => b.Customer)
                .Where(b => b.CusId == customer.CusId)
                .OrderByDescending(b => b.BillYear)
                .ThenByDescending(b => b.BillMonth)
                .ThenByDescending(b => b.BillDate)
                .ToListAsync();

            return Ok(new { customer = customer, bills = bills });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBill(int id)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            var bill = await _context.Bills
                .Include(b => b.Customer)
                .FirstOrDefaultAsync(b => b.BillNo == id);

            if (bill == null)
                return NotFound(new { message = "Bill not found." });

            if (User.IsInRole("Customer"))
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (customer == null || bill.CusId != customer.CusId)
                    return Forbid("You can only access your own bills.");
            }

            return Ok(bill);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Clerk")]
        public async Task<IActionResult> UpdateBill(int id, [FromBody] Bill bill)
        {
            if (id != bill.BillNo)
                return BadRequest(new { message = "Bill ID mismatch." });

            var existingBill = await _context.Bills.FindAsync(id);
            if (existingBill == null)
                return NotFound(new { message = "Bill not found." });

            existingBill.BillDate = bill.BillDate;
            existingBill.BillMonth = bill.BillMonth;
            existingBill.BillYear = bill.BillYear;
            existingBill.PreviousReading = bill.PreviousReading;
            existingBill.CurrentReading = bill.CurrentReading;
            existingBill.MinimumCharge = bill.MinimumCharge;
            existingBill.Rate = bill.Rate;
            existingBill.Status = bill.Status; // Update status

            existingBill.ConsumedUnit = existingBill.CurrentReading - existingBill.PreviousReading;
            existingBill.TotalBillAmount = existingBill.MinimumCharge + (existingBill.ConsumedUnit * existingBill.Rate);
            existingBill.UpdatedDate = DateTime.UtcNow;
            existingBill.UpdatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Bill updated successfully!" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBill(int id)
        {
            var bill = await _context.Bills.FindAsync(id);
            if (bill == null)
                return NotFound(new { message = "Bill not found." });

            _context.Bills.Remove(bill);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Bill deleted successfully!" });
        }

        [HttpPost("mark-overdue")]
        public async Task<IActionResult> MarkOverdueBills()
        {
            var overdueBills = await _context.Bills
                .Where(b => b.Status == "Pending" && b.BillDate.AddDays(30) < DateTime.UtcNow)
                .ToListAsync();
            foreach (var bill in overdueBills)
            {
                bill.Status = "Overdue";
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Overdue bills updated." });
        }
    }
}