using Microsoft.AspNetCore.Identity;
using System;

namespace e_Governance.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public DateTime? DOB { get; set; }
        public long? UserTypeId { get; set; }

        public virtual UserType? UserType { get; set; }
    }
}
