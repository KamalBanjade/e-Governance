using e_Governance.Data;
using e_Governance.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace e_Governance.Controllers
{
    [Authorize(Roles = "Admin,Clerk,Customer")]
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly UserManager<ApplicationUser> _userManager;

        public CustomersController(ApplicationDbContext context, IWebHostEnvironment webHostEnvironment, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
            _userManager = userManager;
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches()
        {
            var branches = await _context.Branches
                .Where(b => b.Status == "Active")
                .Select(b => new { b.BranchId, b.Name })
                .ToListAsync();
            return Ok(branches);
        }

        [HttpGet("demandtypes")]
        public async Task<IActionResult> GetDemandTypes()
        {
            var demandTypes = await _context.DemandTypes
                .Where(d => d.Status == "Active")
                .Select(d => new { d.DemandTypeId, d.Name, d.Description })
                .ToListAsync();
            return Ok(demandTypes);
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] Customer customer)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            customer.UserId = userId; // ✅ set it here

            // Save files if applicable
            if (Request.Form.Files.Count > 0)
            {
                foreach (var formFile in Request.Form.Files)
                {
                    var filePath = Path.Combine("wwwroot/uploads", formFile.FileName); // example path
                    using var stream = new FileStream(filePath, FileMode.Create);
                    await formFile.CopyToAsync(stream);

                    if (formFile.Name == "CitizenshipFile")
                        customer.CitizenshipPath = filePath;
                    if (formFile.Name == "HouseFile")
                        customer.HouseDetailsPath = filePath;
                }
            }

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Customer created successfully!" });
        }


        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var customers = await _context.Customers
                .Include(c => c.RegisteredBranch)
                .Include(c => c.DemandType)
                .ToListAsync();
            return Ok(customers);
        }
    }
}
