using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace e_Governance.Models
{
    public class Customer
    {
        [Key]
        public int CusId { get; set; }

        // Existing fields
        public string SCNo { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public DateTime DOB { get; set; }
        public string MobileNo { get; set; }
        public string CitizenshipNo { get; set; }

        public int DemandTypeId { get; set; }
        public DemandType? DemandType { get; set; }

        public int RegisteredBranchId { get; set; }
        public Branch? RegisteredBranch { get; set; }

        [ForeignKey("User")]
        public string? UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public string? CitizenshipPath { get; set; }
        public string? HouseDetailsPath { get; set; }

        // New fields
        public string? RegistrationMonth { get; set; }  // e.g., "Baisakh"
        public int? RegistrationYear { get; set; }     // e.g., 2080
    }
}
