using e_Governance.Data;
using e_Governance.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class JwtService
{
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<JwtService> _logger;

    public JwtService(IConfiguration config, ApplicationDbContext dbContext, ILogger<JwtService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _logger.LogInformation("JwtService constructor called");
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _logger.LogInformation("Configuration injected successfully");
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _logger.LogInformation("ApplicationDbContext injected successfully");
        _logger.LogInformation("JwtService initialized successfully");
    }

    // Updated method signature to include branchId parameter
    public async Task<string> GenerateToken(ApplicationUser user, IList<string> roles, int? branchId = null)
    {
        _logger.LogInformation("Generating token for user {UserId} with branchId {BranchId}", user.Id, branchId);
        try
        {
            _logger.LogInformation("Querying Customers table for user {UserId}", user.Id);
            var customer = await _dbContext.Customers
                .Where(c => c.UserId == user.Id)
                .Select(c => c.CusId)
                .FirstOrDefaultAsync();
            _logger.LogInformation("Customer ID retrieved: {CustomerId}", customer);

            var keyString = _config["JwtSettings:Key"];
            _logger.LogInformation("JWT Key retrieved: {KeyExists}", !string.IsNullOrEmpty(keyString));
            if (string.IsNullOrEmpty(keyString))
            {
                _logger.LogError("JWT Key is missing in configuration");
                throw new InvalidOperationException("JWT Key is not configured.");
            }

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Name, user.UserName ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim("UserTypeId", user.UserTypeId?.ToString() ?? "3"),
                new Claim("customerId", customer.ToString())
            };

            // IMPORTANT: Add branchId to claims if provided
            if (branchId.HasValue)
            {
                claims.Add(new Claim("branchId", branchId.Value.ToString()));
                _logger.LogInformation("Branch ID {BranchId} added to token claims for user {UserId}", branchId.Value, user.Id);
            }
            else
            {
                _logger.LogWarning("No branch ID provided for user {UserId}", user.Id);
            }

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["JwtSettings:Issuer"],
                audience: _config["JwtSettings:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            _logger.LogInformation("JWT generated successfully for user {UserId} with branch {BranchId}", user.Id, branchId);
            return tokenString;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating JWT for user {UserId} with branch {BranchId}", user.Id, branchId);
            throw;
        }
    }

    // Keep the old method for backward compatibility (without branchId)
    public async Task<string> GenerateToken(ApplicationUser user, IList<string> roles)
    {
        return await GenerateToken(user, roles, null);
    }
}