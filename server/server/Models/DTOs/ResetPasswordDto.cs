namespace server.Models.DTOs
{
    // Models/DTOs/ResetPasswordDto.cs
    public class ResetPasswordDto
    {
        public string Email { get; set; }
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

}
