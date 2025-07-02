using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BillsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BillsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Bills
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Bill>>> GetBills()
        {
            return await _context.Bills
                .Include(b => b.Customer)
                .ToListAsync();
        }

        // GET: api/Bills/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Bill>> GetBill(int id)
        {
            var bill = await _context.Bills
                .Include(b => b.Customer)
                .FirstOrDefaultAsync(b => b.BillNo == id);

            if (bill == null)
            {
                return NotFound();
            }

            return bill;
        }

        // POST: api/Bills
        [HttpPost]
        public async Task<ActionResult<Bill>> CreateBill([FromBody] Bill bill)
        {
            // Validate input
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Validate that the customer exists
            var customerExists = await _context.Customers.AnyAsync(c => c.CusId == bill.CusId);
            if (!customerExists)
            {
                return BadRequest("Customer does not exist.");
            }

            // Auto-calculate ConsumedUnit and TotalBillAmount
            bill.ConsumedUnit = bill.CurrentReading - bill.PreviousReading;
            bill.TotalBillAmount = bill.MinimumCharge + (bill.ConsumedUnit * bill.Rate);

            // Ensure Customer navigation property is not set
            bill.Customer = null; // Explicitly set to null to avoid including it in the database operation

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();

            // Optionally, reload the bill with the Customer data for the response
            var createdBill = await _context.Bills
                .Include(b => b.Customer)
                .FirstOrDefaultAsync(b => b.BillNo == bill.BillNo);

            return CreatedAtAction(nameof(GetBill), new { id = bill.BillNo }, createdBill ?? bill);
        }
    }
}