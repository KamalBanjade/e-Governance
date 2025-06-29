using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using e_Governance.Models;

namespace e_Governance.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser> // Changed from IdentityUser
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Customer> Customers { get; set; }
        public DbSet<Bill> Bills { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<EmployeeDetails> Employees { get; set; }
        public DbSet<UserType> UserTypes { get; set; }
        public DbSet<DemandType> DemandTypes { get; set; }
        public DbSet<EmployeeType> EmployeeTypes { get; set; }
    }
}