using System.ComponentModel.DataAnnotations;

namespace server.Models.DTOs
{
    public class RegisterBranchAdminViewModel
    {
        [Required]
        public int BranchId { get; set; }
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Address { get; set; } = default!;
        public DateTime DOB { get; set; }
        public int UserTypeId { get; set; } = 4;
        public string ContactNo { get; set; } = default!; // Add this
    }
}