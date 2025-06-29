using System.ComponentModel.DataAnnotations;

namespace e_Governance.Models
{
    public class UserType
    {
        [Key]
        public int UserTypeId { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
    }
}
