using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace e_Governance.Models
{
    public class Payment
    {
        [Key]
        public int PaymentId { get; set; }
        public int BillNo { get; set; }
        [ForeignKey("BillNo")]
        public Bill? Bill { get; set; }
        public int PaymentMethodId { get; set; }
        [ForeignKey("PaymentMethodId")]
        public PaymentMethod? PaymentMethod { get; set; }
        public int? CusId { get; set; }
        [ForeignKey("CusId")]
        public Customer? Customer { get; set; }
        public decimal TotalAmountPaid { get; set; }
        public decimal RebateAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public DateTime PaymentDate { get; set; }
        [Required]
        public string TransactionId { get; set; }

        // New fields for Nepali date tracking
        public string? PaymentMonthNepali { get; set; }
        public int? PaymentYearNepali { get; set; }
        public int? PaymentDayNepali { get; set; }
        public string? PaymentDateNepali { get; set; }
        public string? PaymentDateNepaliFormatted { get; set; }
    }
}