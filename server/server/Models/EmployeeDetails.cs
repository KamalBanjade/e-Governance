using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace e_Governance.Models
{
    public class EmployeeDetails
    {
        [Key]
        public int EmpId { get; set; }

        [Required]
        public int EmployeeTypeId { get; set; }

        [ForeignKey("EmployeeTypeId")]
        public EmployeeType? EmployeeType { get; set; }


        [Required]
        public int BranchId { get; set; }
        public Branch? Branch { get; set; }

        [Required]
        public string EmployeeName { get; set; }

        [Required]
        public string ContactNo { get; set; }

        [Required]
        public string Status { get; set; }

        [ForeignKey("User")]
        public string UserId { get; set; }

        public ApplicationUser? User { get; set; }
    }


}
