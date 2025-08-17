import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiFileText, FiCalendar, FiDollarSign, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';

// interface Payment {
//   paymentId: number;
//   billNo: number;
//   paymentMethodId: number;
//   totalAmountPaid: number;
//   rebateAmount: number;
//   penaltyAmount: number;
//   paymentDate: string;
//   transactionId: string;
//   paymentMethod?: { name: string };
// }

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

const PaymentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();
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
  
  const [calculatingPayment, setCalculatingPayment] = useState(false);
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
      calculatePaymentAmounts(bill.billNo, formData.paymentDate);
    }

    fetchBills();
  }, [location.state]);

  const fetchBills = async () => {
    try {
      if (!token) {
        toast.error('No authentication token. Please log in.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      const res = await fetch('http://localhost:5008/api/Bills', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setBills(data);
    } catch (err) {
      toast.error('Failed to fetch bills. Please try again.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      console.error(err);
    }
  };

  const calculatePaymentAmounts = async (billNo: number, paymentDate: string) => {
    if (!billNo || !paymentDate) return;

    setCalculatingPayment(true);
    setCalculationError(null);

    try {
      if (!token) {
        toast.error('No authentication token. Please log in.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      const calculationRequest = {
        billNo: billNo,
        paymentDate: paymentDate,
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
        toast.error('Session expired. Please log in again.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Payment calculation failed: ${errorText}`);
      }

      const calculatedPayment = await res.json();

      setFormData(prev => ({
        ...prev,
        rebateAmount: calculatedPayment.rebateAmount || 0,
        penaltyAmount: calculatedPayment.penaltyAmount || 0,
        totalAmountPaid: calculatedPayment.totalAmountPaid || 0,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate payment amounts';
      setCalculationError(errorMessage);
      toast.error(errorMessage, {
        position: 'bottom-right',
        autoClose: 2000,
      });
      console.error('Payment calculation error:', err);

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

  const validateForm = () => {
    const { billNo, paymentDate, totalAmountPaid } = formData;
    return billNo > 0 && paymentDate && totalAmountPaid > 0 && !calculatingPayment && !calculationError;
  };

  const handleAddPayment = () => {
    if (!validateForm()) {
      if (calculationError) {
        toast.error('Please fix calculation errors before proceeding.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
      } else if (calculatingPayment) {
        toast.error('Please wait for payment calculation to complete.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
      } else {
        toast.error('Please select a bill.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
      }
      return;
    }

    if (!selectedBill) {
      toast.error('Selected bill not found.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      'Create Payment',
      `Are you sure you want to create a payment for Bill No: ${formData.billNo} with total amount $${formData.totalAmountPaid.toFixed(2)}?`,
      () => {
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
            },
          },
        });
      },
      {
        type: 'success',
        confirmText: 'Proceed',
        cancelText: 'Cancel',
        showCancel: true,
      }
    );
  };

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
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-green-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          Create New Payment
        </h2>

        {showCustomerInfo}

        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiFileText className="h2 w-5 text-gray-700" />
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

          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiCalendar className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Payment Date *:</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              className="p-3 rounded-lg border border-gray-300 bg-gray-100 w-full"
              readOnly
            />
          </div>

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
                  ? 'bg-green-300 cursor-not-allowed'
                  : 'bg-green-400 hover:bg-green-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {calculatingPayment ? 'Calculating...' : 'Proceed'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentForm;