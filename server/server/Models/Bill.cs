using e_Governance.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Bill
{
    [Key]
    public int BillNo { get; set; }

    public int CusId { get; set; }

    [ForeignKey("CusId")]
    public Customer Customer { get; set; }          

    public DateTime BillDate { get; set; }
    public string BillMonth { get; set; }
    public int BillYear { get; set; }
    public decimal PreviousReading { get; set; }
    public decimal CurrentReading { get; set; }
    public decimal ConsumedUnit { get; set; }
    public decimal MinimumCharge { get; set; }
    public decimal Rate { get; set; }
    public decimal TotalBillAmount { get; set; }
}
