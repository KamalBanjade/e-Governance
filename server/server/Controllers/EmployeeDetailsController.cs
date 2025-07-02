using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace e_Governance.Controllers
{
    //[Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeDetailsController : ControllerBase

    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public EmployeeDetailsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var employees = await _context.Employees.Include(e => e.Branch).ToListAsync();
            return Ok(employees);
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches()
        {
            try
            {
                var branches = await _context.Branches
                    .Select(b => new { b.BranchId, b.Name })
                    .ToListAsync();
                return Ok(branches);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetBranches: " + ex.Message);
                return StatusCode(500, "Server error");
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
                return Ok(employeeTypes);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetEmployeeTypes: " + ex.Message);
                return StatusCode(500, "Server error");
            }
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create(EmployeeDetails employeeDetails)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated or missing user ID." });

            employeeDetails.UserId = userId;

            _context.Add(employeeDetails);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee created successfully!" });
        }

    }
}
