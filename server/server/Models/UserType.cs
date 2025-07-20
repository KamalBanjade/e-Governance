using System.ComponentModel.DataAnnotations;

namespace e_Governance.Models
{
    public class UserType
    {
        [Key]
        public long UserTypeId { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();
    }
}
