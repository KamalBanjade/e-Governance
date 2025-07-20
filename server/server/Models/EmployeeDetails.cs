using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace e_Governance.Models
{
    public class Employee
    {
        [Key]
        public int EmpId { get; set; }

        [Required]
        public string Username { get; set; } = default!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        public string Name { get; set; } = default!;

        [Required]
        public string Address { get; set; } = default!;

        [Required]
        public DateTime DOB { get; set; }

        [Required]
        public int UserTypeId { get; set; } = 2;

        [Required]
        public int EmployeeTypeId { get; set; }

        [ForeignKey("EmployeeTypeId")]
        public EmployeeType? EmployeeType { get; set; }

        [Required]
        public int BranchId { get; set; }

        [ForeignKey("BranchId")]
        public Branch? Branch { get; set; }

        [Required]
        public string ContactNo { get; set; } = default!;

        [Required]
        public string Status { get; set; } = default!;

        [ForeignKey("User")]
        public string? UserId { get; set; }

        public ApplicationUser? User { get; set; }
    }
}