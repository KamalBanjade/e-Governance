using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace e_Governance.Models
{
    public class Bill
    {
        [Key]
        public int BillNo { get; set; }

        public int CusId { get; set; }
        [ForeignKey("CusId")]
        public Customer? Customer { get; set; }

        public DateTime BillDate { get; set; }
        public string BillMonth { get; set; } = string.Empty;
        public int BillYear { get; set; }

        public decimal PreviousReading { get; set; }
        public decimal CurrentReading { get; set; }
        public decimal ConsumedUnit { get; set; }
        public decimal MinimumCharge { get; set; }
        public decimal Rate { get; set; }
        public decimal TotalBillAmount { get; set; }

        public string Status { get; set; } = "Pending";

        // Gregorian dates (existing)
        public DateTime CreatedDate { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string? UpdatedBy { get; set; }

        // Nepali date fields for CreatedDate
        public string? CreatedDateNepali { get; set; }     // Format: "2080-15-04" (YYYY-DD-MM)
        public string? CreatedMonthNepali { get; set; }    // e.g., "Baisakh"
        public int? CreatedYearNepali { get; set; }        // e.g., 2080
        public int? CreatedDayNepali { get; set; }         // e.g., 15

        // Nepali date fields for UpdatedDate
        public string? UpdatedDateNepali { get; set; }     // Format: "2080-15-04" (YYYY-DD-MM)
        public string? UpdatedMonthNepali { get; set; }    // e.g., "Baisakh"
        public int? UpdatedYearNepali { get; set; }        // e.g., 2080
        public int? UpdatedDayNepali { get; set; }         // e.g., 15
    }
}