import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiFileText, FiPlus } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import type { Bill, Customer } from '../types/models';

// Extended Bill interface to match backend model
interface ExtendedBill extends Bill {
  billNo?: number;
  consumedUnit?: number;
  totalBillAmount?: number;
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  customerName?: string; // Added for display purposes
  customerAddress?: string; // Added for display purposes
}

interface UserInfo {
  role: string;
  userTypeId: number;
  userId: string;
}

// Constants
const EDIT_DATA_KEY = 'editBillData';
const EDIT_MODE_KEY = 'isEditBillOperation';
const EDIT_TIMESTAMP_KEY = 'editBillTimestamp';
const EDIT_SESSION_KEY = 'editBillSessionId';
const API_BASE_URL = 'http://localhost:5008/api';
const BILLS_ENDPOINT = `${API_BASE_URL}/Bills`;
const CUSTOMER_BILLS_ENDPOINT = `${BILLS_ENDPOINT}/customer-bills-with-details`;

const BillList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [bills, setBills] = useState<ExtendedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [, setSelectedCustomer] = useState<Customer | null>(null);
  const token = getAuthToken();

  // Decode JWT token to get user info
  const decodeToken = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role,
        userTypeId: parseInt(payload.userTypeId || '0'),
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Check if user is customer
  const isCustomer = () => {
    return userInfo?.role === 'Customer' || userInfo?.userTypeId === 3;
  };

  // Helper function to create headers
  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Helper function to handle response errors
  const handleResponseError = async (response: Response) => {
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

  // Updated fetchBills function with better error handling and data mapping
  const fetchBills = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const url = isCustomer() ? CUSTOMER_BILLS_ENDPOINT : BILLS_ENDPOINT;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (await handleResponseError(response)) return;

      const data = await response.json();
      
      if (isCustomer()) {
        // Handle customer-specific response structure
        if (data.customer && data.bills) {
          setSelectedCustomer(data.customer);
          setBills(data.bills.map((bill: ExtendedBill) => ({
            ...bill,
            customerName: data.customer.name,
            customerAddress: data.customer.address,
          })));
        } else {
          // Fallback if structure is different
          setBills(Array.isArray(data) ? data : []);
        }
      } else {
        // Handle admin/clerk response structure
        if (Array.isArray(data)) {
          const mappedBills = data.map((bill: any) => ({
            ...bill,
            customerName: bill.customer?.name || 'N/A',
            customerAddress: bill.customer?.address || 'N/A',
          }));
          setBills(mappedBills);
        } else {
          setBills([]);
        }
      }
    } catch (err) {
      toast.error('Failed to fetch bills. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      });
      console.error('Fetch bills error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user info and bills on mount
  useEffect(() => {
    if (!token) {
      confirm(
        'Authentication Required',
        'You need to login to access this page.',
        () => navigate('/login'),
        { type: 'danger', confirmText: 'Login', showCancel: false }
      );
      return;
    }

    const decoded = decodeToken(token);
    setUserInfo(decoded);
  }, [token, navigate, confirm]);

  useEffect(() => {
    if (userInfo) {
      fetchBills();
    }
  }, [userInfo]);

  // Save edit session to localStorage
  const saveEditSession = (bill: ExtendedBill) => {
    const sessionId = uuidv4();
    const editData = {
      billNo: bill.billNo,
      cusId: bill.cusId,
      billDate: bill.billDate,
      billMonth: bill.billMonth,
      billYear: bill.billYear,
      previousReading: bill.previousReading,
      currentReading: bill.currentReading,
      minimumCharge: bill.minimumCharge,
      rate: bill.rate,
      consumedUnit: bill.consumedUnit,
      totalBillAmount: bill.totalBillAmount,
      timestamp: Date.now(),
      sessionId: sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  // Handle edit action
  const handleEdit = (bill: ExtendedBill) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);

    saveEditSession(bill);
    navigate('/billform?edit=true');
  };

  // Handle delete action
  const handleDelete = async (billNo: number) => {
    const bill = bills.find(b => b.billNo === billNo);
    if (!bill) {
      toast.error('Bill not found.');
      return;
    }

    confirm(
      'Delete Bill',
      `Are you sure you want to delete the bill for ${bill.customerName || 'the customer'} for ${bill.billMonth} ${bill.billYear}? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`${BILLS_ENDPOINT}/${billNo}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });

          if (await handleResponseError(response)) return;

          setBills(bills.filter((b) => b.billNo !== billNo));
          toast.success('Bill deleted successfully!', {
            position: 'top-right',
            autoClose: 2000,
          });
        } catch (err) {
          toast.error('Failed to delete bill. Please try again.', {
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
        showCancel: true,
      }
    );
  };

  // Handle add new bill
  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/billform?new=true');
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8 flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-gray-600" size={28} /> Bill List
            </h2>
            {!isCustomer() && (
              <button
                onClick={handleAddNew}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add New Bill
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading bills...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-16">
              <FiFileText className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No bills found.</p>
              {!isCustomer() && (
                <button
                  onClick={handleAddNew}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto"
                >
                  <FiPlus className="mr-2 h-5 w-5" />
                  Add First Bill
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill No</th>
                      {isCustomer() ? (
                        <>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill Month</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill Year</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Address</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill Month</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill Year</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Units Consumed</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill, index) => (
                      <tr
                        key={bill.billNo}
                        className={`border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{bill.billNo}</td>
                        {isCustomer() ? (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.billMonth}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.billYear}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.customerName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.customerAddress}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.billMonth}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{bill.billYear}</td>
                          </>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-900">{bill.consumedUnit?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${bill.totalBillAmount?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(bill)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              title="Edit Bill"
                              aria-label={`Edit bill ${bill.billNo}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            {!isCustomer() && (
                              <button
                                onClick={() => handleDelete(bill.billNo!)}
                                className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                                title="Delete Bill"
                                aria-label={`Delete bill ${bill.billNo}`}
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {bills.length} bill{bills.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Bills: {bills.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BillList;