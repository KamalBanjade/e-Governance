// Models/EmployeeType.cs
using System.ComponentModel.DataAnnotations;

namespace e_Governance.Models
{
    public class EmployeeType
    {
        [Key]
        public int EmployeeTypeId { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
    }
}
