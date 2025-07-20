using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Clerk,Customer")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentController(ApplicationDbContext context)
        {
            _context = context;
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

            payment.Bill = null;
            payment.PaymentMethod = null;

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

            payment.Bill = null;
            payment.PaymentMethod = null;

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
    }
}