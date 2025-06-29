using System.ComponentModel.DataAnnotations;

namespace e_Governance.Models
{
    public class Branch
    {
        [Key]
        public int BranchId { get; set; }
        public string Name { get; set; }
        public string Location { get; set; }
        public string ContactDetails { get; set; }
        public string InchargeName { get; set; }
        public string Status { get; set; }
    }
}
