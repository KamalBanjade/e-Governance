import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

const PaymentList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Payment | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      if (!token) {
        toast.error('No authentication token. Please log in.', {
          position: 'top-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      const res = await fetch('http://localhost:5008/api/Payment', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.', {
          position: 'top-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

      const data = await res.json();
      setPayments(data);
      setFilteredPayments(data);
    } catch (err) {
      toast.error('Failed to fetch payments. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      });
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = payments.filter(
      p =>
        p.transactionId.toLowerCase().includes(term) ||
        p.billNo.toString().includes(term) ||
        (p.paymentMethod?.name || p.paymentMethodId.toString()).toLowerCase().includes(term)
    );
    setFilteredPayments(filtered);
  };

  const handleSort = (key: keyof Payment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredPayments].sort((a, b) => {
      const aValue = key === 'paymentMethod' ? (a.paymentMethod?.name || a.paymentMethodId) : a[key];
      const bValue = key === 'paymentMethod' ? (b.paymentMethod?.name || b.paymentMethodId) : b[key];
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredPayments(sorted);
  };

  const handleDelete = async (id: number) => {
    const payment = payments.find(p => p.paymentId === id);
    if (!payment) {
      toast.error('Payment not found.', {
        position: 'top-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      'Delete Payment',
      `Are you sure you want to delete payment with Transaction ID "${payment.transactionId}"?`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            toast.error('No authentication token. Please log in.', {
              position: 'top-right',
              autoClose: 2000,
            });
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
            toast.error('You are not authorized. Please log in.', {
              position: 'top-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

          toast.success('Payment deleted successfully!', {
            position: 'top-right',
            autoClose: 2000,
          });
          fetchPayments();
        } catch (err) {
          toast.error('Failed to delete payment. Please try again.', {
            position: 'top-right',
            autoClose: 2000,
          });
          console.error('Delete error:', err);
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

  const handleAddNew = () => {
    navigate('/paymentForm?new=true');
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-blue-600 h-8 w-8" />
              Payment List
            </h2>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold hover-scale"
            >
              <FiPlus className="mr-2 h-5 w-5" />
              Add New Payment
            </button>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full bg-gray-50 text-gray-900"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-16">
              <FiFileText className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No payments found.</p>
              <button
                onClick={handleAddNew}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add First Payment
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      {[
                        { label: 'Payment ID', key: 'paymentId' },
                        { label: 'Bill No', key: 'billNo' },
                        { label: 'Payment Method', key: 'paymentMethod' },
                        { label: 'Total Amount', key: 'totalAmountPaid' },
                        { label: 'Rebate Amount', key: 'rebateAmount' },
                        { label: 'Penalty Amount', key: 'penaltyAmount' },
                        { label: 'Payment Date', key: 'paymentDate' },
                        { label: 'Transaction ID', key: 'transactionId' },
                        { label: 'Actions', key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={key ? () => handleSort(key as keyof Payment) : undefined}
                        >
                          {label}
                          {key && sortConfig.key === key && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment, index) => (
                      <tr
                        key={payment.paymentId}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{payment.paymentId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{payment.billNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{payment.paymentMethod?.name || payment.paymentMethodId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${payment.totalAmountPaid.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${payment.rebateAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${payment.penaltyAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{payment.transactionId}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(payment.paymentId)}
                              className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                              title="Delete Payment"
                              aria-label={`Delete payment ${payment.transactionId}`}
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Payments: {payments.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentList;