import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiCreditCard, FiDollarSign, FiCalendar, FiHash, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
// import type { Payment, Bill, PaymentMethod } from '../types/models';
// import { isAdmin } from '../utility/auth';


interface Payment {
  paymentId: number;
  billNo: number;
  paymentMethodId: number;
  totalAmountPaid: number;
  rebateAmount: number;
  penaltyAmount: number;
  paymentDate: string;
  transactionId: string;
  paymentMethod?: { name: string }; // Optional navigation property
}

interface Bill {
  billNo: number;
}

interface PaymentMethod {
  paymentMethodId: number;
  name: string;
}
// Utility function to generate unique TransactionId
const generateTransactionId = () => {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `TX${uuid.slice(0, 10)}`;
};

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [formData, setFormData] = useState<Payment>({
    paymentId: 0,
    billNo: 0,
    paymentMethodId: 0,
    totalAmountPaid: 0,
    rebateAmount: 0,
    penaltyAmount: 0,
    paymentDate: '',
    transactionId: generateTransactionId(),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!isAdmin()) {
//       toast.error('Unauthorized access. Redirecting to login.');
//       navigate('/unauthorized');
//     }
//   }, [navigate]);

  useEffect(() => {
    fetchPayments();
    fetchBills();
    fetchPaymentMethods();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5008/api/Payment', { credentials: 'include' });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
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
      const response = await fetch('http://localhost:5008/api/Bills', { credentials: 'include' });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setBills(data);
    } catch (err) {
      toast.error('Failed to fetch bills. Please try again.');
      console.error('Error fetching bills:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('http://localhost:5008/api/PaymentMethod', { credentials: 'include' });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPaymentMethods(data);
    } catch (err) {
      toast.error('Failed to fetch payment methods. Please try again.');
      console.error('Error fetching payment methods:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['totalAmountPaid', 'rebateAmount', 'penaltyAmount'].includes(name)
        ? parseFloat(value) || 0
        : ['billNo', 'paymentMethodId'].includes(name)
        ? parseInt(value) || 0
        : value,
    }));
  };

  const validateForm = () => {
    const { billNo, paymentMethodId, totalAmountPaid, paymentDate, transactionId } = formData;
    return billNo > 0 && paymentMethodId > 0 && totalAmountPaid > 0 && paymentDate && transactionId;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `http://localhost:5008/api/Payment/${formData.paymentId}`
        : 'http://localhost:5008/api/Payment';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          paymentDate: new Date(formData.paymentDate).toISOString().split('T')[0],
          paymentMethod: undefined, // Exclude navigation property
        }),
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.errors
          ? Object.values(errorData.errors).flat().join(', ')
          : errorData.message || 'Failed to save payment';
        throw new Error(errorMessage);
      }

      await fetchPayments();
      resetForm();
      toast.success(isEditing ? 'Payment updated successfully!' : 'Payment added successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payment: Payment) => {
    setFormData({
      ...payment,
      paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
      paymentMethod: undefined, // Ensure navigation property is not included
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5008/api/Payment/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      await fetchPayments();
      toast.success('Payment deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      paymentId: 0,
      billNo: 0,
      paymentMethodId: 0,
      totalAmountPaid: 0,
      rebateAmount: 0,
      penaltyAmount: 0,
      paymentDate: '',
      transactionId: generateTransactionId(),
      paymentMethod: undefined, // Ensure navigation property is not included
    });
    setIsEditing(false);
  };
return (
    <>
     <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Payment' : 'Add New Payment'}
        </h2>

        <div className="space-y-6">
          {/* Bill No - Full width */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiFileText className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Bill No *:</span>
            </label>
            <select
              name="billNo"
              value={formData.billNo}
              onChange={handleChange}
              className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
              required
            >
              <option value="">Select Bill No</option>
              {bills.map(bill => (
                <option key={bill.billNo} value={bill.billNo}>{bill.billNo.toString()}</option>
              ))}
            </select>
          </div>

          {/* Payment Method - Full width */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiCreditCard className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Payment Method *:</span>
            </label>
            <select
              name="paymentMethodId"
              value={formData.paymentMethodId}
              onChange={handleChange}
              className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
              required
            >
              <option value="">Select Payment Method</option>
              {paymentMethods.map(pm => (
                <option key={pm.paymentMethodId} value={pm.paymentMethodId}>{pm.name}</option>
              ))}
            </select>
          </div>

          {/* Total Amount Paid and Rebate Amount - Same row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiDollarSign className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Total Amount Paid *:</span>
              </label>
              <input
                type="number"
                name="totalAmountPaid"
                value={formData.totalAmountPaid}
                onChange={handleChange}
                placeholder="0.00"
                className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiDollarSign className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Rebate Amount:</span>
              </label>
              <input
                type="number"
                name="rebateAmount"
                value={formData.rebateAmount}
                onChange={handleChange}
                placeholder="0.00"
                className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Penalty Amount and Payment Date - Same row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiDollarSign className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Penalty Amount:</span>
              </label>
              <input
                type="number"
                name="penaltyAmount"
                value={formData.penaltyAmount}
                onChange={handleChange}
                placeholder="0.00"
                className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                <FiCalendar className="h-5 w-5 text-gray-700" />
                <span className="ml-2">Payment Date *:</span>
              </label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                required
              />
            </div>
          </div>

          {/* Transaction ID - Full width */}
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-gray-700 font-medium">
              <FiHash className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Transaction ID *:</span>
            </label>
            <input
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full bg-gray-100"
              required
              disabled
            />
          </div>

          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center ${
                loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Processing...' : isEditing ? 'Update Payment' : 'Add Payment'}
            </button>
            {isEditing && (
              <button
                onClick={resetForm}
                className="px-8 py-3 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment List</h3>
          {loading ? (
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
                          onClick={() => handleEdit(payment)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
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
          )}
        </div>
      </div>
    </>
  );
};

export default Payments;