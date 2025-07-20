using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace e_Governance.Controllers
{
    [Route("api/[controller]")]
    //[Authorize(Roles = "Admin,Clerk")]
    [ApiController]
    public class DemandTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DemandTypeController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/DemandType
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DemandType>>> GetDemandTypes()
        {
            return await _context.DemandTypes.ToListAsync();
        }

        // GET: api/DemandType/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DemandType>> GetDemandType(int id)
        {
            var demandType = await _context.DemandTypes.FindAsync(id);

            if (demandType == null)
            {
                return NotFound();
            }

            return demandType;
        }

        // POST: api/DemandType
        [HttpPost]
        public async Task<ActionResult<DemandType>> CreateDemandType([FromBody] DemandType demandType)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.DemandTypes.Add(demandType);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDemandType), new { id = demandType.DemandTypeId }, demandType);
        }

        // PUT: api/DemandType/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDemandType(int id, [FromBody] DemandType demandType)
        {
            if (id != demandType.DemandTypeId)
            {
                return BadRequest("DemandType ID mismatch.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.Entry(demandType).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DemandTypeExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/DemandType/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDemandType(int id)
        {
            var demandType = await _context.DemandTypes.FindAsync(id);
            if (demandType == null)
            {
                return NotFound();
            }

            _context.DemandTypes.Remove(demandType);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool DemandTypeExists(int id)
        {
            return _context.DemandTypes.Any(e => e.DemandTypeId == id);
        }
    }
}