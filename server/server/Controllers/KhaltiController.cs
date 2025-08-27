using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Models;
using System.Text;
using System.Text.Json;
using e_Governance.Data;
using e_Governance.Models;
using DateConverterNepali;
using Microsoft.EntityFrameworkCore;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class KhaltiController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly string _khaltiSecretKey;
        private readonly string _khaltiBaseUrl;
        private readonly string _returnUrl;
        private readonly string _websiteUrl;

        public KhaltiController(HttpClient httpClient, IConfiguration configuration, ApplicationDbContext context)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context;
            _khaltiSecretKey = Environment.GetEnvironmentVariable("KHALTI_SECRET_KEY") ?? _configuration["Khalti:SecretKey"] ?? "";
            _khaltiBaseUrl = _configuration["Khalti:BaseUrl"] ?? "https://dev.khalti.com/api/v2/";
            _returnUrl = _configuration["Khalti:ReturnUrl"] ?? "http://localhost:5173/payment-callback";
            _websiteUrl = _configuration["Khalti:WebsiteUrl"] ?? "http://localhost:5173";
        }

        [HttpPost("initiate-payment")]
        public async Task<ActionResult<KhaltiPaymentResponse>> InitiatePayment([FromBody] KhaltiPaymentRequest request)
        {
            try
            {
                if (request == null)
                {
                    Console.WriteLine("Request is null");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Request body is null or invalid"
                    });
                }

                if (request.BillNo <= 0)
                {
                    Console.WriteLine($"Invalid bill number: {request.BillNo}");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Invalid bill number"
                    });
                }

                if (request.Amount <= 0)
                {
                    Console.WriteLine($"Invalid amount: {request.Amount}");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Invalid amount"
                    });
                }

                if (string.IsNullOrWhiteSpace(request.CustomerName))
                {
                    Console.WriteLine($"Invalid customer name: '{request.CustomerName}'");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Customer name is required"
                    });
                }

                if (string.IsNullOrWhiteSpace(request.CustomerEmail))
                {
                    Console.WriteLine($"Invalid customer email: '{request.CustomerEmail}'");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Customer email is required"
                    });
                }

                // Check if secret key is configured
                if (string.IsNullOrEmpty(_khaltiSecretKey))
                {
                    Console.WriteLine("Khalti secret key is not configured");
                    return StatusCode(500, new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = "Payment gateway configuration error"
                    });
                }

                // Convert amount from rupees to paisa (multiply by 100)
                var amountInPaisa = (int)(request.Amount * 100);
                Console.WriteLine($"Amount in paisa: {amountInPaisa}");

                var khaltiRequest = new KhaltiInitiateRequest
                {
                    ReturnUrl = _returnUrl,
                    WebsiteUrl = _websiteUrl,
                    Amount = amountInPaisa,
                    PurchaseOrderId = $"BILL_{request.BillNo}_{DateTime.UtcNow:yyyyMMddHHmmss}",
                    PurchaseOrderName = $"Electricity Bill Payment - {request.BillNo}",
                    CustomerInfo = new KhaltiCustomerInfo
                    {
                        Name = request.CustomerName,
                        Email = request.CustomerEmail,
                        Phone = !string.IsNullOrWhiteSpace(request.CustomerPhone) ? request.CustomerPhone : "9800000000"
                    },
                    AmountBreakdown = new List<KhaltiAmountBreakdown>
                    {
                        new KhaltiAmountBreakdown
                        {
                            Label = "Bill Amount",
                            Amount = amountInPaisa
                        }
                    },
                    ProductDetails = new List<KhaltiProductDetail>
                    {
                        new KhaltiProductDetail
                        {
                            Identity = request.BillNo.ToString(),
                            Name = $"Electricity Bill - {request.BillNo}",
                            TotalPrice = amountInPaisa,
                            Quantity = 1,
                            UnitPrice = amountInPaisa
                        }
                    }
                };

                var json = JsonSerializer.Serialize(khaltiRequest, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                Console.WriteLine($"Sending to Khalti API: {json}");

                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"key {_khaltiSecretKey}");

                var khaltiUrl = $"{_khaltiBaseUrl}epayment/initiate/";
                Console.WriteLine($"Making request to: {khaltiUrl}");

                var response = await _httpClient.PostAsync(khaltiUrl, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"Khalti API response status: {response.StatusCode}");
                Console.WriteLine($"Khalti API response: {responseContent}");

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var khaltiResponse = JsonSerializer.Deserialize<KhaltiInitiateResponse>(responseContent);

                        if (khaltiResponse == null)
                        {
                            Console.WriteLine("Failed to deserialize Khalti response");
                            return StatusCode(500, new KhaltiPaymentResponse
                            {
                                Success = false,
                                Message = "Invalid response from payment gateway"
                            });
                        }

                        return Ok(new KhaltiPaymentResponse
                        {
                            Success = true,
                            PaymentUrl = khaltiResponse.PaymentUrl,
                            Pidx = khaltiResponse.Pidx,
                            Message = "Payment initiated successfully"
                        });
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"JSON deserialization error: {ex.Message}");
                        return StatusCode(500, new KhaltiPaymentResponse
                        {
                            Success = false,
                            Message = "Failed to parse payment gateway response"
                        });
                    }
                }
                else
                {
                    // Try to parse error response for more details
                    string errorMessage = $"Khalti API Error: {response.StatusCode}";
                    try
                    {
                        var errorJson = JsonDocument.Parse(responseContent);
                        if (errorJson.RootElement.TryGetProperty("detail", out var detail))
                        {
                            errorMessage = $"Khalti API Error: {detail.GetString()}";
                        }
                        else if (errorJson.RootElement.TryGetProperty("message", out var message))
                        {
                            errorMessage = $"Khalti API Error: {message.GetString()}";
                        }
                    }
                    catch
                    {
                        // If we can't parse the error, use the raw response
                        errorMessage = $"Khalti API Error: {responseContent}";
                    }

                    Console.WriteLine($"Khalti API error: {errorMessage}");
                    return BadRequest(new KhaltiPaymentResponse
                    {
                        Success = false,
                        Message = errorMessage
                    });
                }
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"HTTP Request Exception in InitiatePayment: {ex}");
                return StatusCode(500, new KhaltiPaymentResponse
                {
                    Success = false,
                    Message = "Failed to connect to payment gateway"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Exception in InitiatePayment: {ex}");
                return StatusCode(500, new KhaltiPaymentResponse
                {
                    Success = false,
                    Message = $"Internal server error: {ex.Message}"
                });
            }
        }

        [HttpGet("verify-payment/{pidx}")]
        public async Task<ActionResult<KhaltiLookupResponse>> VerifyPayment(string pidx)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(pidx))
                {
                    return BadRequest("PIDX is required");
                }

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"key {_khaltiSecretKey}");

                var lookupRequest = new KhaltiLookupRequest { Pidx = pidx };
                var json = JsonSerializer.Serialize(lookupRequest);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                Console.WriteLine($"Verifying payment with PIDX: {pidx}");

                var response = await _httpClient.PostAsync($"{_khaltiBaseUrl}epayment/lookup/", content);
                var responseContent = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"Lookup API response status: {response.StatusCode}");
                Console.WriteLine($"Lookup API response: {responseContent}");

                if (response.IsSuccessStatusCode)
                {
                    var lookupResponse = JsonSerializer.Deserialize<KhaltiLookupResponse>(responseContent);
                    return Ok(lookupResponse);
                }
                else
                {
                    return BadRequest($"Payment verification failed: {responseContent}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in VerifyPayment: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("handle-callback")]
        [AllowAnonymous] // This endpoint should be accessible without authentication
        public async Task<IActionResult> HandleCallback([FromQuery] string pidx, [FromQuery] string status,
            [FromQuery] string? transaction_id, [FromQuery] int amount, [FromQuery] string purchase_order_id)
        {
            try
            {
                Console.WriteLine($"Received callback - PIDX: {pidx}, Status: {status}, TransactionId: {transaction_id}, Amount: {amount}, PurchaseOrderId: {purchase_order_id}");

                // Verify the payment using lookup API
                var verificationResult = await VerifyPayment(pidx);

                if (verificationResult.Result is OkObjectResult okResult && okResult.Value is KhaltiLookupResponse lookupResponse)
                {
                    if (lookupResponse.Status == "Completed")
                    {
                        // Extract bill number from purchase_order_id
                        var billNo = ExtractBillNumberFromPurchaseOrderId(purchase_order_id);

                        Console.WriteLine($"Payment verified successfully for Bill No: {billNo}");

                        // Update the database
                        await UpdatePaymentRecordInDatabase(billNo, transaction_id, lookupResponse.TotalAmount / 100m);

                        return Ok(new { success = true, message = "Payment verified successfully" });
                    }
                }

                return BadRequest(new { success = false, message = "Payment verification failed" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in HandleCallback: {ex}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private async Task UpdatePaymentRecordInDatabase(int billNo, string transactionId, decimal totalAmountPaid)
        {
            try
            {
                // First, get the bill and verify it exists
                var bill = await _context.Bills.FirstOrDefaultAsync(b => b.BillNo == billNo);
                if (bill == null)
                {
                    Console.WriteLine($"Bill {billNo} not found in database");
                    return;
                }

                // Check if payment already exists to avoid duplicates
                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.BillNo == billNo && p.TransactionId == transactionId);
                if (existingPayment != null)
                {
                    Console.WriteLine($"Payment already exists for Bill {billNo} with Transaction ID {transactionId}");
                    return;
                }

                // Get Khalti payment method (you might need to adjust this based on your PaymentMethod setup)
                var khaltiPaymentMethod = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.Name.ToLower().Contains("khalti"));

                if (khaltiPaymentMethod == null)
                {
                    Console.WriteLine("Khalti payment method not found in database");
                    return;
                }

                var paymentDate = DateTime.UtcNow;
                var days = (paymentDate - bill.BillDate).Days;

                // Calculate rebate and penalty using the same logic as PaymentController
                decimal rebate = 0;
                decimal penalty = 0;

                if (days <= 7)
                {
                    rebate = bill.TotalBillAmount * 0.02m; // 2% discount
                }
                else if (days >= 16 && days <= 30)
                {
                    penalty = bill.TotalBillAmount * 0.05m; // 5% fine
                }
                else if (days >= 31 && days <= 40)
                {
                    penalty = bill.TotalBillAmount * 0.10m; // 10% fine
                }
                else if (days >= 41 && days <= 60)
                {
                    penalty = bill.TotalBillAmount * 0.25m; // 25% fine
                }
                else if (days >= 61)
                {
                    penalty = bill.TotalBillAmount * 0.5m; // 50% fine
                }

                // Create new payment record
                var payment = new Payment
                {
                    BillNo = billNo,
                    CusId = bill.CusId,
                    PaymentMethodId = khaltiPaymentMethod.PaymentMethodId,
                    PaymentDate = paymentDate,
                    RebateAmount = rebate,
                    PenaltyAmount = penalty,
                    TotalAmountPaid = totalAmountPaid, // Use the actual amount from Khalti
                    TransactionId = transactionId
                };

                // Set Nepali date fields using the same method as PaymentController
                SetNepaliDateFields(payment);

                // Add payment to database
                _context.Payments.Add(payment);

                // Update bill status to "Paid"
                bill.Status = "Paid";
                _context.Bills.Update(bill);

                // Save changes
                await _context.SaveChangesAsync();

                Console.WriteLine($"Payment record created successfully for Bill {billNo}, Transaction ID: {transactionId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating payment record in database: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw; // Re-throw to be handled by the calling method
            }
        }

        // Add this method to set Nepali date fields (same as in PaymentController)
        private void SetNepaliDateFields(Payment payment)
        {
            try
            {
                var paymentDate = payment.PaymentDate;

                // Use DateConverterNepali library for accurate conversion
                var nepaliDate = DateConverter.GetDateInBS(paymentDate);

                // Extract the converted values
                var nepaliYear = nepaliDate.npYear;
                var nepaliMonth = nepaliDate.nepaliMonthInEnglishFont; // Gets month name like "Baisakh"
                var nepaliDay = nepaliDate.npDay;
                var nepaliMonthNumber = nepaliDate.npMonth;

                // Set the Nepali date fields
                payment.PaymentMonthNepali = nepaliMonth;
                payment.PaymentYearNepali = nepaliYear;
                payment.PaymentDayNepali = nepaliDay;

                // Format the date string (YYYY-MM-DD format)
                payment.PaymentDateNepali = $"{nepaliYear}-{nepaliMonthNumber:D2}-{nepaliDay:D2}";

                // Format the readable date string
                payment.PaymentDateNepaliFormatted = $"{nepaliMonth} {nepaliDay}, {nepaliYear}";

                Console.WriteLine($"Converted {paymentDate:yyyy-MM-dd} to Nepali date: {payment.PaymentDateNepaliFormatted}");
            }
            catch (Exception ex)
            {
                // Fallback to approximate conversion if DateConverterNepali fails
                Console.WriteLine($"DateConverterNepali failed, using fallback conversion for date: {payment.PaymentDate}. Error: {ex.Message}");
                SetNepaliDateFieldsFallback(payment);
            }
        }

        // Fallback method for approximate conversion
        private void SetNepaliDateFieldsFallback(Payment payment)
        {
            var paymentDate = payment.PaymentDate;
            var englishMonth = paymentDate.Month;
            var englishYear = paymentDate.Year;
            var englishDay = paymentDate.Day;

            // Basic English to Nepali month mapping (approximate)
            var nepaliMonths = new string[]
            {
                "Baisakh", "Jestha", "Ashadh", "Shrawan",
                "Bhadra", "Ashwin", "Kartik", "Mangsir",
                "Poush", "Magh", "Falgun", "Chaitra"
            };

            // Approximate conversion
            var nepaliYear = englishYear + 57; // Basic conversion
            var nepaliMonthIndex = Math.Min(englishMonth - 1, nepaliMonths.Length - 1);
            var nepaliMonth = nepaliMonths[nepaliMonthIndex];
            var nepaliDay = Math.Min(englishDay, 30); // Nepali months typically have 29-32 days

            payment.PaymentMonthNepali = nepaliMonth;
            payment.PaymentYearNepali = nepaliYear;
            payment.PaymentDayNepali = nepaliDay;
            payment.PaymentDateNepali = $"{nepaliYear}-{englishMonth:D2}-{nepaliDay:D2}";
            payment.PaymentDateNepaliFormatted = $"{nepaliMonth} {nepaliDay}, {nepaliYear}";
        }

        private int ExtractBillNumberFromPurchaseOrderId(string purchaseOrderId)
        {
            try
            {
                // Extract bill number from format "BILL_{billNo}_{timestamp}"
                var parts = purchaseOrderId.Split('_');
                if (parts.Length >= 2 && int.TryParse(parts[1], out int billNo))
                {
                    return billNo;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error extracting bill number from {purchaseOrderId}: {ex.Message}");
            }
            return 0;
        }
    }
}