import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiPlus, FiTrash2, FiFileText, FiCalendar, FiDollarSign, FiSend
} from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';

interface Payment {
  paymentId: number;
  billNo: number;
  paymentMethodId: number;
  totalAmountPaid: number;
  rebateAmount: number;
  penaltyAmount: number;
  paymentDate: string;
  transactionId: string;
  paymentMethod?: { name: string };
}

interface Bill {
  billNo: number;
  billMonth: string;
  billYear: number;
  totalBillAmount: number;
  billDate: string;
}

interface Customer {
  cusId: number;
  name: string;
  address: string;
}

const generateTransactionId = () => {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `TX${uuid.slice(0, 10)}`;
};

const Payments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    billNo: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    rebateAmount: 0,
    penaltyAmount: 0,
    totalAmountPaid: 0,
    transactionId: generateTransactionId(),
  });
  const [loading, setLoading] = useState(false);
  const [calculatingPayment, setCalculatingPayment] = useState(false);
  const [showList, setShowList] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (location.state?.bill) {
      const { bill, customer } = location.state;
      setSelectedBill(bill);
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        billNo: bill.billNo,
        rebateAmount: 0,
        penaltyAmount: 0,
        totalAmountPaid: 0,
      }));
      // Calculate payment amounts when bill is selected
      calculatePaymentAmounts(bill.billNo, formData.paymentDate);
    }

    fetchPayments();
    fetchBills();
  }, [location.state]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      if (!token) {
        toast.error('No authentication token. Please log in.');
        navigate('/login');
        return;
      }

      const res = await fetch('http://localhost:5008/api/Payment', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setPayments(data);
    } catch (err) {
      toast.error('Failed to fetch payments. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      if (!token) {
        toast.error('No authentication token. Please log in.');
        navigate('/login');
        return;
      }

      const res = await fetch('http://localhost:5008/api/Bills', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setBills(data);
    } catch (err) {
      toast.error('Failed to fetch bills. Please try again.');
      console.error(err);
    }
  };

  // Function to get payment calculation from backend ONLY
  const calculatePaymentAmounts = async (billNo: number, paymentDate: string) => {
    if (!billNo || !paymentDate) return;

    setCalculatingPayment(true);
    setCalculationError(null);
    
    try {
      if (!token) {
        toast.error('No authentication token. Please log in.');
        navigate('/login');
        return;
      }

      // Send request to backend calculate endpoint
      const calculationRequest = {
        billNo: billNo,
        paymentDate: paymentDate
      };

      const res = await fetch('http://localhost:5008/api/Payment/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(calculationRequest),
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Payment calculation failed: ${errorText}`);
      }

      const calculatedPayment = await res.json();
      
      // Update form with backend calculated values
      setFormData(prev => ({
        ...prev,
        rebateAmount: calculatedPayment.rebateAmount || 0,
        penaltyAmount: calculatedPayment.penaltyAmount || 0,
        totalAmountPaid: calculatedPayment.totalAmountPaid || 0,
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate payment amounts';
      setCalculationError(errorMessage);
      toast.error(errorMessage);
      console.error('Payment calculation error:', err);
      
      // Reset amounts on error
      setFormData(prev => ({
        ...prev,
        rebateAmount: 0,
        penaltyAmount: 0,
        totalAmountPaid: 0,
      }));
    } finally {
      setCalculatingPayment(false);
    }
  };

  const handleBillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const billNo = parseInt(e.target.value) || 0;
    const bill = bills.find(b => b.billNo === billNo);
    
    setSelectedBill(bill || null);
    setFormData(prev => ({
      ...prev,
      billNo,
      rebateAmount: 0,
      penaltyAmount: 0,
      totalAmountPaid: 0,
    }));

    if (billNo && bill) {
      calculatePaymentAmounts(billNo, formData.paymentDate);
    }
  };

  const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPaymentDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      paymentDate: newPaymentDate,
    }));

    // Recalculate when payment date changes
    if (formData.billNo && selectedBill) {
      calculatePaymentAmounts(formData.billNo, newPaymentDate);
    }
  };

  const validateForm = () => {
    const { billNo, paymentDate, totalAmountPaid } = formData;
    return billNo > 0 && paymentDate && totalAmountPaid > 0 && !calculatingPayment && !calculationError;
  };

  const handleAddPayment = async () => {
    if (!validateForm()) {
      if (calculationError) {
        toast.error('Please fix calculation errors before proceeding.');
      } else if (calculatingPayment) {
        toast.error('Please wait for payment calculation to complete.');
      } else {
        toast.error('Please select a bill and payment date.');
      }
      return;
    }

    if (!selectedBill) {
      toast.error('Selected bill not found.');
      return;
    }

    // Navigate to PaymentPage with bill and payment data
    navigate('/PaymentPage', {
      state: {
        bill: selectedBill,
        customer: selectedCustomer,
        payment: {
          billNo: formData.billNo,
          rebateAmount: formData.rebateAmount,
          penaltyAmount: formData.penaltyAmount,
          totalAmountPaid: formData.totalAmountPaid,
          paymentDate: formData.paymentDate,
          transactionId: formData.transactionId,
        }
      }
    });
  };

  

  const handleDelete = async (id: number) => {
    const payment = payments.find(p => p.paymentId === id);
    if (!payment) {
      toast.error('Payment not found.');
      return;
    }

    confirm(
      'Delete Payment',
      `Are you sure you want to delete payment with Transaction ID: ${payment.transactionId}?`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            toast.error('No authentication token. Please log in.');
            navigate('/login');
            return;
          }

          const res = await fetch(`http://localhost:5008/api/Payment/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401) {
            toast.error('You are not authorized. Please log in.');
            navigate('/login');
            return;
          }

          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

          await fetchPayments();
          toast.success('Payment deleted successfully!');
        } catch (err) {
          toast.error('Failed to delete payment.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      {
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
      }
    );
  };

  // const resetForm = () => {
  //   if (location.state?.bill) {
  //     setFormData({
  //       billNo: location.state.bill.billNo,
  //       paymentDate: new Date().toISOString().split("T")[0],
  //       rebateAmount: 0,
  //       penaltyAmount: 0,
  //       totalAmountPaid: 0,
  //       transactionId: generateTransactionId(),
  //     });
  //     // Recalculate for the reset form
  //     calculatePaymentAmounts(location.state.bill.billNo, new Date().toISOString().split("T")[0]);
  //   } else {
  //     setFormData({
  //       billNo: 0,
  //       paymentDate: new Date().toISOString().split("T")[0],
  //       rebateAmount: 0,
  //       penaltyAmount: 0,
  //       totalAmountPaid: 0,
  //       transactionId: generateTransactionId(),
  //     });
  //     setSelectedBill(null);
  //     setSelectedCustomer(null);
  //   }
  //   setCalculationError(null);
  // };

  // Show customer info if available
  const showCustomerInfo = selectedCustomer && (
    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Customer Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700">Name:</span>
          <span className="ml-2 text-gray-900">{selectedCustomer.name}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Address:</span>
          <span className="ml-2 text-gray-900">{selectedCustomer.address}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          Create New Payment
        </h2>

        {showCustomerInfo}

        <div className="space-y-6">
          {/* Bill No */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiFileText className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Bill No *:</span>
            </label>
            {location.state?.bill ? (
              <div className="p-3 rounded-lg border border-gray-300 bg-gray-100 w-full">
                <span className="font-medium">
                  {selectedBill?.billNo} - {selectedBill?.billMonth} {selectedBill?.billYear} (${selectedBill?.totalBillAmount.toFixed(2)})
                </span>
              </div>
            ) : (
              <select
                value={formData.billNo}
                onChange={handleBillChange}
                className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                required
              >
                <option value="">Select Bill No</option>
                {bills.map(bill => (
                  <option key={bill.billNo} value={bill.billNo}>
                    {bill.billNo} - {bill.billMonth} {bill.billYear} (${bill.totalBillAmount.toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Date */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiCalendar className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Payment Date *:</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={handlePaymentDateChange}
              className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
              required
            />
          </div>

          {/* Calculation Status */}
          {calculatingPayment && (
            <div className="text-center text-blue-600 font-medium p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Calculating payment amounts from server...
            </div>
          )}

          {calculationError && (
            <div className="text-center text-red-600 font-medium p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-semibold">Calculation Error:</p>
              <p className="text-sm">{calculationError}</p>
              <p className="text-xs mt-2">Please ensure the backend /calculate endpoint is available.</p>
            </div>
          )}

          {/* Rebate Amount and Penalty Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiDollarSign className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Rebate Amount:</span>
              </label>
              <input
                type="number"
                value={formData.rebateAmount.toFixed(2)}
                className="p-3 rounded-lg border border-gray-300 bg-gray-100 w-full"
                readOnly
                step="0.01"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiDollarSign className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Penalty Amount:</span>
              </label>
              <input
                type="number"
                value={formData.penaltyAmount.toFixed(2)}
                className="p-3 rounded-lg border border-gray-300 bg-gray-100 w-full"
                readOnly
                step="0.01"
              />
            </div>
          </div>

          {/* Total Amount Paid */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiDollarSign className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Total Amount to Pay:</span>
            </label>
            <input
              type="number"
              value={formData.totalAmountPaid.toFixed(2)}
              className="p-3 rounded-lg border border-gray-300 bg-gray-100 w-full font-bold text-lg"
              readOnly
              step="0.01"
            />
          </div>

          {/* Payment calculation info - only show if we have valid data */}
          {formData.paymentDate && selectedBill && formData.totalAmountPaid > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Payment Details:</h4>
              <div className="text-sm text-gray-800 space-y-1">
                <p>Bill Date: {new Date(selectedBill.billDate).toLocaleDateString()}</p>
                <p>Payment Date: {new Date(formData.paymentDate).toLocaleDateString()}</p>
                <p>Days from Bill Date: {Math.floor((new Date(formData.paymentDate).getTime() - new Date(selectedBill.billDate).getTime()) / (1000 * 60 * 60 * 24))}</p>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={handleAddPayment}
              disabled={!validateForm()}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center ${
                !validateForm()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {calculatingPayment ? 'Calculating...' : 'Proceed'}
            </button>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Payment List</h3>
            <button
              onClick={() => setShowList(prev => !prev)}
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {showList ? 'Hide Payment List' : 'View Payment List'}
            </button>
          </div>

          {showList && (
            loading ? (
              <div className="text-center text-gray-600">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center text-gray-600">No payments found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PaymentId</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">BillNo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Method</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">TotalAmountPaid</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">RebateAmount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PenaltyAmount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PaymentDate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">TransactionId</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.paymentId} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{payment.paymentId}</td>
                        <td className="px-4 py-3">{payment.billNo}</td>
                        <td className="px-4 py-3">{payment.paymentMethod?.name || payment.paymentMethodId}</td>
                        <td className="px-4 py-3">${payment.totalAmountPaid.toFixed(2)}</td>
                        <td className="px-4 py-3">${payment.rebateAmount.toFixed(2)}</td>
                        <td className="px-4 py-3">${payment.penaltyAmount.toFixed(2)}</td>
                        <td className="px-4 py-3">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{payment.transactionId}</td>
                        <td className="px-4 py-3 flex space-x-2">
                          <button
                            onClick={() => handleDelete(payment.paymentId)}
                            className="p-2 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default Payments;