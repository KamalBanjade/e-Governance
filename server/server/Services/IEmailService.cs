namespace server.Services
{
    // Services/IEmailService.cs
    public interface IEmailService
    {
        Task SendAsync(string toEmail, string subject, string message);
    }

}
