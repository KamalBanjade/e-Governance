using System.Text.Json.Serialization;

namespace server.Models
{
    public class KhaltiInitiateRequest
    {
        [JsonPropertyName("return_url")]
        public string ReturnUrl { get; set; } = string.Empty;

        [JsonPropertyName("website_url")]
        public string WebsiteUrl { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public int Amount { get; set; } // Amount in paisa

        [JsonPropertyName("purchase_order_id")]
        public string PurchaseOrderId { get; set; } = string.Empty;

        [JsonPropertyName("purchase_order_name")]
        public string PurchaseOrderName { get; set; } = string.Empty;

        [JsonPropertyName("customer_info")]
        public KhaltiCustomerInfo? CustomerInfo { get; set; }

        [JsonPropertyName("amount_breakdown")]
        public List<KhaltiAmountBreakdown>? AmountBreakdown { get; set; }

        [JsonPropertyName("product_details")]
        public List<KhaltiProductDetail>? ProductDetails { get; set; }

        [JsonPropertyName("merchant_username")]
        public string? MerchantUsername { get; set; }

        [JsonPropertyName("merchant_extra")]
        public string? MerchantExtra { get; set; }
    }

    public class KhaltiCustomerInfo
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;
    }

    public class KhaltiAmountBreakdown
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public int Amount { get; set; }
    }

    public class KhaltiProductDetail
    {
        [JsonPropertyName("identity")]
        public string Identity { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("total_price")]
        public int TotalPrice { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("unit_price")]
        public int UnitPrice { get; set; }
    }

    public class KhaltiInitiateResponse
    {
        [JsonPropertyName("pidx")]
        public string Pidx { get; set; } = string.Empty;

        [JsonPropertyName("payment_url")]
        public string PaymentUrl { get; set; } = string.Empty;

        [JsonPropertyName("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }

    public class KhaltiLookupResponse
    {
        [JsonPropertyName("pidx")]
        public string Pidx { get; set; } = string.Empty;

        [JsonPropertyName("total_amount")]
        public int TotalAmount { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("transaction_id")]
        public string? TransactionId { get; set; }

        [JsonPropertyName("fee")]
        public int Fee { get; set; }

        [JsonPropertyName("refunded")]
        public bool Refunded { get; set; }
    }

    // Request model from frontend
    public class KhaltiPaymentRequest
    {
        [JsonPropertyName("billNo")]
        public int BillNo { get; set; }

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("customerName")]
        public string CustomerName { get; set; } = string.Empty;

        [JsonPropertyName("customerEmail")]
        public string CustomerEmail { get; set; } = string.Empty;

        [JsonPropertyName("customerPhone")]
        public string CustomerPhone { get; set; } = string.Empty;
    }

    // Response model to frontend
    public class KhaltiPaymentResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("paymentUrl")]
        public string? PaymentUrl { get; set; }

        [JsonPropertyName("pidx")]
        public string? Pidx { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
        [JsonPropertyName("transaction_id")]
        public string? TransactionId { get; set; }

        [JsonPropertyName("fee")]
        public int Fee { get; set; }

        [JsonPropertyName("refunded")]
        public bool Refunded { get; set; }  
    }
    public class KhaltiLookupRequest
    {
        [JsonPropertyName("pidx")]
        public string Pidx { get; set; } = string.Empty;
    }
}