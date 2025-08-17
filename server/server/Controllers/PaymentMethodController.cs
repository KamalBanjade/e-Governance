using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    //[Authorize(Roles = "Admin,Clerk")]
    [ApiController]
    public class PaymentMethodController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentMethodController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/PaymentMethod
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentMethod>>> GetPaymentMethods()
        {
            return await _context.PaymentMethods.ToListAsync();
        }

        // GET: api/PaymentMethod/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentMethod>> GetPaymentMethod(int id)
        {
            var paymentMethod = await _context.PaymentMethods.FindAsync(id);

            if (paymentMethod == null)
            {
                return NotFound();
            }

            return paymentMethod;
        }

        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetCustomerPaymentMethods(int customerId)
        {
            var paymentMethods = await _context.Payments
                .Where(p => p.CusId == customerId)
                .GroupBy(p => p.PaymentMethod)
                .Select(g => new
                {
                    id = g.Key.PaymentMethodId.ToString(),
                    name = g.Key.Name,
                    transactions = g.Count(),
                    amount = g.Sum(p => p.TotalAmountPaid)
                })
                .Where(pm => pm.transactions > 0)
                .ToListAsync();

            if (!paymentMethods.Any())
            {
                return Ok(new List<object>()); // Return empty list if no payment methods found
            }

            return Ok(paymentMethods);
        }

        // POST: api/PaymentMethod
        [HttpPost]
        public async Task<ActionResult<PaymentMethod>> CreatePaymentMethod([FromBody] PaymentMethod paymentMethod)
        {
            if (!ModelState.IsValid || string.IsNullOrEmpty(paymentMethod.Name) || string.IsNullOrEmpty(paymentMethod.Status) || string.IsNullOrEmpty(paymentMethod.LogoURL))
            {
                return BadRequest("Name, status, and logoURL are required.");
            }

            _context.PaymentMethods.Add(paymentMethod);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPaymentMethod), new { id = paymentMethod.PaymentMethodId }, paymentMethod);
        }

        // PUT: api/PaymentMethod/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePaymentMethod(int id, [FromBody] PaymentMethod paymentMethod)
        {
            if (id != paymentMethod.PaymentMethodId)
            {
                return BadRequest("PaymentMethod ID mismatch.");
            }

            if (!ModelState.IsValid || string.IsNullOrEmpty(paymentMethod.Name) || string.IsNullOrEmpty(paymentMethod.Status) || string.IsNullOrEmpty(paymentMethod.LogoURL))
            {
                return BadRequest("Name, status, and logoURL are required.");
            }

            _context.Entry(paymentMethod).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PaymentMethodExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }
        [HttpGet("by-branch")]
        public async Task<ActionResult<IEnumerable<object>>> GetPaymentMethodsByBranch([FromQuery] int? branchId)
        {
            try
            {
                var paymentMethods = await _context.PaymentMethods
                    .Where(pm => _context.Payments.Any(p => p.PaymentMethodId == pm.PaymentMethodId
                        && _context.Bills.Any(b => b.BillNo == p.BillNo
                            && _context.Customers.Any(c => c.CusId == b.CusId && c.RegisteredBranchId == branchId))))
                    .Select(pm => new
                    {
                        pm.PaymentMethodId,
                        pm.Name,
                        pm.Status,
                        pm.LogoURL,
                        Transactions = _context.Payments.Count(p => p.PaymentMethodId == pm.PaymentMethodId
                            && _context.Bills.Any(b => b.BillNo == p.BillNo
                                && _context.Customers.Any(c => c.CusId == b.CusId && c.RegisteredBranchId == branchId))),
                        TotalAmount = _context.Payments.Where(p => p.PaymentMethodId == pm.PaymentMethodId
                            && _context.Bills.Any(b => b.BillNo == p.BillNo
                                && _context.Customers.Any(c => c.CusId == b.CusId && c.RegisteredBranchId == branchId)))
                            .Sum(p => p.TotalAmountPaid)
                    })
                    .ToListAsync();

                return Ok(paymentMethods);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error", error = ex.Message });
            }
        }

        // DELETE: api/PaymentMethod/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePaymentMethod(int id)
        {
            var paymentMethod = await _context.PaymentMethods.FindAsync(id);
            if (paymentMethod == null)
            {
                return NotFound();
            }

            _context.PaymentMethods.Remove(paymentMethod);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PaymentMethodExists(int id)
        {
            return _context.PaymentMethods.Any(e => e.PaymentMethodId == id);
        }
    }
}