import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDialog } from '../Contexts/DialogContext';
import { useAuth } from '../Components/AuthContext';
import { motion } from 'framer-motion';
import { getAuthToken } from '../utility/auth';

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
  cusId?: number;
  branchId?: number;
}

interface Branch {
  branchId: number;
  name: string;
}

interface UserInfo {
  role: string;
  userTypeId: number;
  userId: string;
  branchId?: number;
}

const PaymentList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const { isAuthenticated, userRole, userTypeId, customerId } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Payment | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userBranchId, setUserBranchId] = useState<number | null>(null);

  const token = getAuthToken();
  const API_BASE_URL = 'http://localhost:5008/api';

  // Decode JWT token to extract user information
  const decodeToken = (token: string): UserInfo | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'Admin',
        userTypeId: parseInt(payload.userTypeId || '1'),
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 'user-id',
        branchId: payload.branchId ? parseInt(payload.branchId) : undefined,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Get user's branch ID from various sources
  const getUserBranchId = (): number | null => {
    // First, try to get branchId from decoded token
    if (userInfo?.branchId) {
      return userInfo.branchId;
    }

    // Then try localStorage keys
    const possibleKeys = ['userBranchId', 'branchId', 'currentBranchId'];
    for (const key of possibleKeys) {
      const branchId = localStorage.getItem(key);
      if (branchId && !isNaN(Number(branchId))) {
        return parseInt(branchId, 10);
      }
    }

    // Try user object in localStorage
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user?.branchId && !isNaN(Number(user.branchId))) {
          return parseInt(user.branchId, 10);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    console.warn('Could not determine user branch ID from any source');
    return null;
  };

  const isCustomer = () => userRole === 'Customer' || Number(userTypeId) === 3 || userInfo?.role === 'Customer' || userInfo?.userTypeId === 3;
  const isBranchAdmin = (): boolean => userInfo?.role === 'BranchAdmin';

  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const handleResponseError = async (response: Response): Promise<boolean> => {
    if (response.status === 401) {
      confirm(
        'Session Expired',
        'Your session has expired. Please log in again.',
        () => navigate('/login'),
        { type: 'danger', confirmText: 'Login', showCancel: false }
      );
      return true;
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    return false;
  };

  // Fetch branches for display purposes
  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches`, {
        headers: getAuthHeaders(),
      });
      if (await handleResponseError(response)) return;
      const data = await response.json();
      console.log('Fetched branches:', data);
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branch information', { position: 'bottom-right', autoClose: 3000 });
    }
  };

  // Get current user's branch name for display
  const getCurrentUserBranchName = (): string => {
    console.log('Getting branch name for ID:', userBranchId, 'from branches:', branches);
    
    if (!userBranchId) {
      return 'No Branch Assigned';
    }
    
    if (branches.length === 0) {
      return 'Loading Branch...';
    }
    
    const branch = branches.find(b => b.branchId === userBranchId);
    if (branch) {
      return branch.name;
    }
    
    return `Branch ID: ${userBranchId} (Not Found)`;
  };

  // Get appropriate page title based on user role
  const getPageTitle = (): string => {
    if (isCustomer()) {
      return 'My Payments';
    }
    if (isBranchAdmin()) {
      return `Payment Directory - ${getCurrentUserBranchName()}`;
    }
    return 'Payment Directory';
  };

  // Get appropriate page description based on user role
  const getPageDescription = (): string => {
    if (isCustomer()) {
      return 'View and manage your payment records';
    }
    if (isBranchAdmin()) {
      const branchName = getCurrentUserBranchName();
      if (branchName === 'Loading Branch...' || branchName === 'No Branch Assigned') {
        return 'Manage payments for your branch';
      }
      return `Manage payments in ${branchName} branch`;
    }
    return 'Manage payment records efficiently';
  };

  const fetchPayments = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const branchId = getUserBranchId();
      setUserBranchId(branchId);
      console.log('Current user branch ID:', branchId);

      let endpoint = `${API_BASE_URL}/Payment`;
      
      if (isBranchAdmin() && branchId) {
        // Use branch-specific endpoint for branch admins
        endpoint = `${API_BASE_URL}/payment/by-branch?branchId=${branchId}`;
      } else if (isCustomer() && customerId) {
        // Use customer-specific endpoint for customers
        endpoint = `${API_BASE_URL}/Payment/customer-payments?cusId=${customerId}`;
      }

      console.log('Fetching payments from endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (await handleResponseError(response)) return;

      const data = await response.json();
      console.log('Fetched payments:', data);

      // Handle the response data
      if (Array.isArray(data)) {
        setPayments(data);
        setFilteredPayments(data);
      } else {
        setPayments([]);
        setFilteredPayments([]);
      }
    } catch (err) {
      toast.error('Failed to fetch payments. Please try again.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      confirm(
        'Authentication Required',
        'You need to login to access this page.',
        () => navigate('/login'),
        { type: 'danger', confirmText: 'Login', showCancel: false }
      );
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    const decoded = decodeToken(token);
    setUserInfo(decoded);
    console.log('Decoded user info:', decoded);
  }, [isAuthenticated, token, navigate, confirm]);

  useEffect(() => {
    if (userInfo) {
      const fetchInitialData = async () => {
        // Always fetch branches first (even for customers, in case they need it later)
        await fetchBranches();
        // Then set the branch ID and fetch payments
        const branchId = getUserBranchId();
        setUserBranchId(branchId);
        await fetchPayments();
      };
      fetchInitialData();
    }
  }, [userInfo, customerId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = payments.filter(
      p =>
        p.transactionId.toLowerCase().includes(term) ||
        p.billNo.toString().includes(term) ||
        (p.paymentMethod?.name || p.paymentMethodId.toString()).toLowerCase().includes(term) ||
        p.paymentId.toString().includes(term)
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
      const aValue = key === 'paymentMethod' ? (a.paymentMethod?.name || a.paymentMethodId.toString()) : a[key];
      const bValue = key === 'paymentMethod' ? (b.paymentMethod?.name || b.paymentMethodId.toString()) : b[key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;

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
        position: 'bottom-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      'Delete Payment',
      `Are you sure you want to delete payment with Transaction ID "${payment.transactionId}"? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            toast.error('No authentication token. Please log in.', {
              position: 'bottom-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          const response = await fetch(`${API_BASE_URL}/Payment/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });

          if (await handleResponseError(response)) return;

          setPayments(payments.filter(p => p.paymentId !== id));
          setFilteredPayments(filteredPayments.filter(p => p.paymentId !== id));
          toast.success('Payment deleted successfully!', {
            position: 'bottom-right',
            autoClose: 2000,
          });
        } catch (err) {
          toast.error('Failed to delete payment. Please try again.', {
            position: 'bottom-right',
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
    navigate('/PaymentForm?new=true');
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <span className="bg-blue-100 p-3 rounded-full mr-4 shadow-sm">
                  <FiFileText className="text-blue-600 text-2xl" />
                </span>
                {getPageTitle()}
              </h1>
              <p className="text-gray-600 mt-2">{getPageDescription()}</p>
              {isBranchAdmin() && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Branch: {getCurrentUserBranchName()}
                </div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.01, translateY: -4 }}
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform"
            >
              <FiPlus className="mr-2" />
              Add New Payment
            </motion.button>
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex justify-end">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 placeholder-gray-400 text-gray-700"
                />
              </div>
            </div>
          </motion.div>

          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-12 text-center"
            >
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-800">Loading payment data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </motion.div>
          ) : filteredPayments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100"
            >
              <FiFileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No payments found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm ? 'Try adjusting your search query' : isBranchAdmin() ? `Your payment list is currently empty for ${getCurrentUserBranchName()} branch` : 'Your payment list is currently empty'}
              </p>
              <motion.button
                whileHover={{ scale: 1.01, translateY: -4 }}
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl mx-auto"
              >
                <FiPlus className="mr-2" />
                Add New Payment
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { label: 'Payment ID', key: 'paymentId' },
                        { label: 'Bill No', key: 'billNo' },
                        { label: 'Payment Method', key: 'paymentMethod' },
                        { label: 'Total Amount', key: 'totalAmountPaid' },
                        { label: 'Rebate Amount', key: 'rebateAmount' },
                        { label: 'Penalty Amount', key: 'penaltyAmount' },
                        { label: 'Payment Date', key: 'paymentDate' },
                        { label: 'Transaction ID', key: 'transactionId' },
                        ...(isCustomer() ? [] : [{ label: 'Actions', key: null }]),
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment, index) => (
                      <motion.tr
                        key={payment.paymentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{payment.paymentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.billNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                            {payment.paymentMethod?.name || payment.paymentMethodId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium">
                            रु. {payment.totalAmountPaid.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">रु. {payment.rebateAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">रु. {payment.penaltyAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{payment.transactionId}</td>
                        {!isCustomer() && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleDelete(payment.paymentId)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Payment"
                                aria-label={`Delete payment ${payment.transactionId}`}
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination/Summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center"
              >
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Showing <span className="font-medium">{filteredPayments.length}</span> of{' '}
                  <span className="font-medium">{payments.length}</span> payments
                </div>
                <div className="bg-blue-50 text-blue-700 text-base font-semibold px-4 py-2 rounded-lg">
                  Total Payments: {payments.length}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default PaymentList;