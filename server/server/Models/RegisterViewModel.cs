using System.Text.Json.Serialization;

namespace server.Models
{
    public class RegisterViewModel
    {
        [JsonPropertyName("username")]
        public string Username { get; set; }

        [JsonPropertyName("password")]
        public string Password { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("dob")]
        public DateTime? DOB { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("userTypeId")]
        public long? UserTypeId { get; set; }
    }
}