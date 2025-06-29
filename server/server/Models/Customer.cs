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

        [Required]
        public string SCNo { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public string Address { get; set; }

        [Required]
        public DateTime DOB { get; set; }

        [Required]
        public string MobileNo { get; set; }

        [Required]
        public string CitizenshipNo { get; set; }

        [ForeignKey("DemandType")]
        public int DemandTypeId { get; set; }
        public DemandType? DemandType { get; set; }

        [Required]
        [ForeignKey("RegisteredBranch")]
        public int RegisteredBranchId { get; set; }
        public Branch? RegisteredBranch { get; set; }

        [BindNever]
        [ForeignKey("User")]
        public string? UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public string? CitizenshipPath { get; set; }
        public string? HouseDetailsPath { get; set; }

    }
}
