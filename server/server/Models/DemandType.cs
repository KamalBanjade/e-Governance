// Models/DemandType.cs
using System.ComponentModel.DataAnnotations;

namespace e_Governance.Models
{
    public class DemandType
    {
        [Key]
        public int DemandTypeId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
    }
}
