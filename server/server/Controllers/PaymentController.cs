using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Payment
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payment>>> GetPayments()
        {
            return await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.PaymentMethod)
                .ToListAsync();
        }

        // GET: api/Payment/5
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

        // POST: api/Payment
        [HttpPost]
        public async Task<ActionResult<Payment>> CreatePayment([FromBody] Payment payment)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { Errors = errors });
            }

            // Validate foreign keys
            var billExists = await _context.Bills.AnyAsync(b => b.BillNo == payment.BillNo);
            if (!billExists)
            {
                return BadRequest("Invalid BillNo: Bill does not exist.");
            }

            var paymentMethodExists = await _context.PaymentMethods.AnyAsync(pm => pm.PaymentMethodId == payment.PaymentMethodId);
            if (!paymentMethodExists)
            {
                return BadRequest("Invalid PaymentMethodId: Payment method does not exist.");
            }

            // Ensure navigation properties are not included
            payment.Bill = null;
            payment.PaymentMethod = null;

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // Reload payment with navigation properties for response
            var createdPayment = await _context.Payments
                .Include(p => p.Bill)
                .Include(p => p.PaymentMethod)
                .FirstOrDefaultAsync(p => p.PaymentId == payment.PaymentId);

            return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentId }, createdPayment ?? payment);
        }

        // PUT: api/Payment/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, [FromBody] Payment payment)
        {
            if (id != payment.PaymentId)
            {
                return BadRequest("Payment ID mismatch.");
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { Errors = errors });
            }

            // Validate foreign keys
            var billExists = await _context.Bills.AnyAsync(b => b.BillNo == payment.BillNo);
            if (!billExists)
            {
                return BadRequest("Invalid BillNo: Bill does not exist.");
            }

            var paymentMethodExists = await _context.PaymentMethods.AnyAsync(pm => pm.PaymentMethodId == payment.PaymentMethodId);
            if (!paymentMethodExists)
            {
                return BadRequest("Invalid PaymentMethodId: Payment method does not exist.");
            }

            // Ensure navigation properties are not included
            payment.Bill = null;
            payment.PaymentMethod = null;

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

        // DELETE: api/Payment/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
            {
                return NotFound();
            }

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PaymentExists(int id)
        {
            return _context.Payments.Any(e => e.PaymentId == id);
        }
    }
}