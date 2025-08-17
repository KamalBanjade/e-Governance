using DateConverterNepali;
using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using server.Models.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Clerk,Customer,BranchAdmin")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PaymentController> _logger;

        // Define Nepali months list
        private static readonly List<string> nepaliMonths = new List<string>
        {
            "Baisakh", "Jestha", "Ashadh", "Shrawan",
            "Bhadra", "Ashwin", "Kartik", "Mangsir",
            "Poush", "Magh", "Falgun", "Chaitra"
        };

        public PaymentController(ApplicationDbContext context, ILogger<PaymentController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private void SetNepaliDateFields(Payment payment)
        {
            try
            {
                var paymentDate = payment.PaymentDate;

                // Use DateConverterNepali library for accurate conversion
                var nepaliDate = DateConverter.GetDateInBS(paymentDate);

                // Extract the converted values
                var nepaliYear = nepaliDate.npYear;
                var nepaliMonth = nepaliDate.nepaliMonthInEnglishFont; // Gets month name like "Baisakh"
                var nepaliDay = nepaliDate.npDay;
                var nepaliMonthNumber = nepaliDate.npMonth;

                // Set the Nepali date fields
                payment.PaymentMonthNepali = nepaliMonth;
                payment.PaymentYearNepali = nepaliYear;
                payment.PaymentDayNepali = nepaliDay;

                // Format the date string (YYYY-MM-DD format)
                payment.PaymentDateNepali = $"{nepaliYear}-{nepaliMonthNumber:D2}-{nepaliDay:D2}";

                // Format the readable date string
                payment.PaymentDateNepaliFormatted = $"{nepaliMonth} {nepaliDay}, {nepaliYear}";

                _logger.LogInformation("Converted {EnglishDate} to Nepali date: {NepaliDate}",
                    paymentDate.ToString("yyyy-MM-dd"), payment.PaymentDateNepaliFormatted);
            }
            catch (Exception ex)
            {
                // Fallback to approximate conversion if DateConverterNepali fails
                _logger.LogWarning(ex, "DateConverterNepali failed, using fallback conversion for date: {Date}",
                    payment.PaymentDate);

                SetNepaliDateFieldsFallback(payment);
            }
        }

        // Fallback method for approximate conversion (keep as backup)
        private void SetNepaliDateFieldsFallback(Payment payment)
        {
            var paymentDate = payment.PaymentDate;
            var englishMonth = paymentDate.Month;
            var englishYear = paymentDate.Year;
            var englishDay = paymentDate.Day;

            // Basic English to Nepali month mapping (approximate)
            var nepaliMonths = new string[]
            {
                "Baisakh", "Jestha", "Ashadh", "Shrawan",
                "Bhadra", "Ashwin", "Kartik", "Mangsir",
                "Poush", "Magh", "Falgun", "Chaitra"
            };

            // Approximate conversion
            var nepaliYear = englishYear + 57; // Basic conversion
            var nepaliMonthIndex = Math.Min(englishMonth - 1, nepaliMonths.Length - 1);
            var nepaliMonth = nepaliMonths[nepaliMonthIndex];
            var nepaliDay = Math.Min(englishDay, 30); // Nepali months typically have 29-32 days

            payment.PaymentMonthNepali = nepaliMonth;
            payment.PaymentYearNepali = nepaliYear;
            payment.PaymentDayNepali = nepaliDay;
            payment.PaymentDateNepali = $"{nepaliYear}-{englishMonth:D2}-{nepaliDay:D2}";
            payment.PaymentDateNepaliFormatted = $"{nepaliMonth} {nepaliDay}, {nepaliYear}";
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payment>>> GetPayments()
        {
            return await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.PaymentMethod)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Payment>> GetPayment(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.PaymentMethod)
                .FirstOrDefaultAsync(p => p.PaymentId == id);

            if (payment == null)
            {
                return NotFound();
            }

            return payment;
        }

        [HttpPost]
        public async Task<ActionResult<Payment>> CreatePayment([FromBody] Payment payment)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { Errors = errors });
            }

            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.BillNo == payment.BillNo);
            if (bill == null)
            {
                return BadRequest("Invalid BillNo: Bill does not exist.");
            }

            var paymentMethodExists = await _context.PaymentMethods.AnyAsync(pm => pm.PaymentMethodId == payment.PaymentMethodId);
            if (!paymentMethodExists)
            {
                return BadRequest("Invalid PaymentMethodId: Payment method does not exist.");
            }

            // Validate CusId
            if (payment.CusId.HasValue)
            {
                var customerExists = await _context.Customers.AnyAsync(c => c.CusId == payment.CusId);
                if (!customerExists)
                {
                    return BadRequest("Invalid CusId: Customer does not exist.");
                }
                if (bill.CusId != payment.CusId)
                {
                    return BadRequest("Bill does not belong to the specified customer.");
                }
            }
            else
            {
                payment.CusId = bill.CusId;
            }

            var days = (payment.PaymentDate - bill.BillDate).Days;

            decimal rebate = 0;
            decimal penalty = 0;

            if (days <= 7)
            {
                rebate = bill.TotalBillAmount * 0.02m; // 2% discount
            }
            else if (days >= 16 && days <= 30)
            {
                penalty = bill.TotalBillAmount * 0.05m; // 5% fine
            }
            else if (days >= 31 && days <= 40)
            {
                penalty = bill.TotalBillAmount * 0.10m; // 10% fine
            }
            else if (days >= 41 && days <= 60)
            {
                penalty = bill.TotalBillAmount * 0.25m; // 25% fine
            }

            var finalAmount = bill.TotalBillAmount - rebate + penalty;

            payment.RebateAmount = rebate;
            payment.PenaltyAmount = penalty;
            payment.TotalAmountPaid = finalAmount;

            // Set Nepali date fields using DateConverterNepali
            SetNepaliDateFields(payment);

            payment.Bill = null;
            payment.PaymentMethod = null;
            payment.Customer = null;

            // Update bill status to Paid
            bill.Status = "Paid";
            _context.Bills.Update(bill);

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            var createdPayment = await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.PaymentMethod)
                .FirstOrDefaultAsync(p => p.PaymentId == payment.PaymentId);

            return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentId }, createdPayment ?? payment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, [FromBody] Payment payment)
        {
            if (id != payment.PaymentId)
                return BadRequest("Payment ID mismatch.");

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { Errors = errors });
            }

            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.BillNo == payment.BillNo);
            if (bill == null)
            {
                return BadRequest("Invalid BillNo: Bill does not exist.");
            }

            var paymentMethodExists = await _context.PaymentMethods.AnyAsync(pm => pm.PaymentMethodId == payment.PaymentMethodId);
            if (!paymentMethodExists)
            {
                return BadRequest("Invalid PaymentMethodId: Payment method does not exist.");
            }

            // Validate CusId
            if (payment.CusId.HasValue)
            {
                var customerExists = await _context.Customers.AnyAsync(c => c.CusId == payment.CusId);
                if (!customerExists)
                {
                    return BadRequest("Invalid CusId: Customer does not exist.");
                }
                if (bill.CusId != payment.CusId)
                {
                    return BadRequest("Bill does not belong to the specified customer.");
                }
            }
            else
            {
                payment.CusId = bill.CusId;
            }

            var days = (payment.PaymentDate - bill.BillDate).Days;

            decimal rebate = 0;
            decimal penalty = 0;

            if (days <= 7)
                rebate = bill.TotalBillAmount * 0.02m;
            else if (days >= 16 && days <= 30)
                penalty = bill.TotalBillAmount * 0.05m;
            else if (days >= 31 && days <= 40)
                penalty = bill.TotalBillAmount * 0.10m;
            else if (days >= 41 && days <= 60)
                penalty = bill.TotalBillAmount * 0.25m;

            payment.RebateAmount = rebate;
            payment.PenaltyAmount = penalty;
            payment.TotalAmountPaid = bill.TotalBillAmount - rebate + penalty;

            // Set Nepali date fields using DateConverterNepali
            SetNepaliDateFields(payment);

            payment.Bill = null;
            payment.PaymentMethod = null;
            payment.Customer = null;

            // Update bill status to Paid
            bill.Status = "Paid";
            _context.Bills.Update(bill);

            _context.Entry(payment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PaymentExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
            {
                return NotFound();
            }

            // Revert bill status to Pending
            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.BillNo == payment.BillNo);
            if (bill != null)
            {
                bill.Status = "Pending";
                _context.Bills.Update(bill);
            }

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();

            return NoContent();
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
            return Ok(new { message = $"{overdueBills.Count} bills marked as overdue." });
        }

        private bool PaymentExists(int id)
        {
            return _context.Payments.Any(e => e.PaymentId == id);
        }

        [HttpPost("calculate")]
        public async Task<ActionResult<object>> CalculatePayment([FromBody] PaymentCalculationRequest request)
        {
            if (request == null || request.BillNo <= 0 || request.PaymentDate == default)
            {
                return BadRequest("BillNo and PaymentDate are required for calculation.");
            }

            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.BillNo == request.BillNo);
            if (bill == null)
            {
                return BadRequest("Invalid BillNo: Bill does not exist.");
            }

            var days = (request.PaymentDate - bill.BillDate).Days;

            decimal rebate = 0;
            decimal penalty = 0;

            if (days <= 7)
                rebate = bill.TotalBillAmount * 0.02m;
            else if (days >= 16 && days <= 30)
                penalty = bill.TotalBillAmount * 0.05m;
            else if (days >= 31 && days <= 40)
                penalty = bill.TotalBillAmount * 0.10m;
            else if (days >= 41 && days <= 60)
                penalty = bill.TotalBillAmount * 0.25m;
            else if (days >= 61)
                penalty = bill.TotalBillAmount * 0.5m;

            var finalAmount = bill.TotalBillAmount - rebate + penalty;

            return Ok(new
            {
                RebateAmount = rebate,
                PenaltyAmount = penalty,
                TotalAmountPaid = finalAmount
            });
        }
        [HttpGet("by-branch")]
        public async Task<IActionResult> GetPaymentsByBranch([FromQuery] int? branchId)
        {
            try
            {
                if (!branchId.HasValue)
                {
                    _logger.LogWarning("Branch ID is required for fetching payments.");
                    return BadRequest(new { message = "Branch ID is required." });
                }

                _logger.LogInformation("Fetching payments for branch ID: {BranchId}", branchId);

                var payments = await _context.Payments
                    .Include(p => p.Bill)
                        .ThenInclude(b => b.Customer)
                    .Include(p => p.PaymentMethod)
                    .Where(p => p.Bill != null && p.Bill.Customer != null && p.Bill.Customer.RegisteredBranchId == branchId)
                    .ToListAsync();

                var sortedPayments = payments
                    .OrderByDescending(p => p.PaymentYearNepali)
                    .ThenByDescending(p => nepaliMonths.IndexOf(p.PaymentMonthNepali ?? "Baisakh"))
                    .ThenByDescending(p => p.PaymentDayNepali)
                    .ToList();

                var paymentsResponse = sortedPayments.Select(p => new
                {
                    p.PaymentId,
                    p.BillNo,
                    p.CusId,
                    Customer = p.Bill?.Customer != null ? new
                    {
                        p.Bill.Customer.CusId,
                        Name = p.Bill.Customer.Name ?? "Unknown",
                        Address = p.Bill.Customer.Address ?? ""
                    } : null,
                    Bill = p.Bill != null ? new
                    {
                        p.Bill.BillNo,
                        p.Bill.BillDate,
                        p.Bill.TotalBillAmount
                    } : null,
                    p.PaymentMethodId,
                    PaymentMethod = p.PaymentMethod != null ? new
                    {
                        p.PaymentMethod.PaymentMethodId,
                        p.PaymentMethod.Name
                    } : null,
                    p.PaymentDate,
                    p.PaymentDateNepali,
                    p.PaymentMonthNepali,
                    p.PaymentYearNepali,
                    p.PaymentDayNepali,
                    PaymentDateNepaliFormatted = p.PaymentYearNepali != null && p.PaymentMonthNepali != null && p.PaymentDayNepali != null
                        ? $"{p.PaymentYearNepali}/{nepaliMonths.IndexOf(p.PaymentMonthNepali) + 1:D2}/{p.PaymentDayNepali:D2} ({p.PaymentMonthNepali})"
                        : null,
                    p.RebateAmount,
                    p.PenaltyAmount,
                    p.TotalAmountPaid,
                    p.TransactionId 
                }).ToList();

                _logger.LogInformation("Successfully fetched {Count} payments for branch ID: {BranchId}", paymentsResponse.Count, branchId);
                return Ok(paymentsResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching payments for branch ID: {BranchId}", branchId);
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        [HttpGet("customer-payments")]
        public async Task<IActionResult> GetCustomerPayments(string cusId)
        {
            if (string.IsNullOrEmpty(cusId) || !int.TryParse(cusId, out int parsedCusId))
            {
                return BadRequest("Invalid customer ID.");
            }

            // Restrict access to the authenticated user's own payments
            var userCustomerId = User.FindFirst("customerId")?.Value;
            if (User.IsInRole("Customer") && userCustomerId != cusId)
            {
                return Unauthorized("You can only access your own payments.");
            }

            var payments = await _context.Payments
                .Where(p => p.CusId == parsedCusId)
                .Include(p => p.PaymentMethod)
                .Include(p => p.Bill)
                .ToListAsync();

            return Ok(payments);
        }
    }
}