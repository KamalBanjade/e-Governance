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
        public DbSet<Employee> Employees { get; set; }
        public DbSet<UserType> UserTypes { get; set; }
        public DbSet<DemandType> DemandTypes { get; set; }
        public DbSet<EmployeeType> EmployeeTypes { get; set; }
        public DbSet<BranchAdmin> BranchAdmins { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Explicitly define the FK between ApplicationUser and UserType
            builder.Entity<ApplicationUser>()
                .HasOne(u => u.UserType)
                .WithMany() // or .WithMany(u => u.Users) if you define a collection in UserType
                .HasForeignKey(u => u.UserTypeId)
                .OnDelete(DeleteBehavior.SetNull); // Or .Restrict / .Cascade as needed

            // Optional: map DOB to proper SQL type if needed
            builder.Entity<ApplicationUser>()
                .Property(u => u.DOB)
                .HasColumnType("date"); // Avoid time if not needed
        }

    }

    }