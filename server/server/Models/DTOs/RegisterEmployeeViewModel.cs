namespace server.Models.DTOs
{
    public class RegisterEmployeeViewModel
    {
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Address { get; set; } = default!;
        public DateTime DOB { get; set; }
        public int UserTypeId { get; set; } = 2; 
    }
}
