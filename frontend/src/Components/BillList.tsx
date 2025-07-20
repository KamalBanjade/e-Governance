import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiFileText, FiPlus, FiSearch, FiFilter, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import type { Bill } from '../types/models';

// Extended Bill interface to match backend model
interface ExtendedBill extends Bill {
  billNo?: number;
  consumedUnit?: number;
  totalBillAmount?: number;
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  customerName?: string;
  customerAddress?: string;
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

const BillList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [bills, setBills] = useState<ExtendedBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<ExtendedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExtendedBill | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterMonth, setFilterMonth] = useState('');
  const token = getAuthToken();

  // Decode JWT token to get user info
  const decodeToken = (token: string): UserInfo | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'Admin',
        userTypeId: parseInt(payload.userTypeId || '1'),
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 'user-id',
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Check if user is customer
  const isCustomer = (): boolean => userInfo?.role === 'Customer' || userInfo?.userTypeId === 3;

  // Helper function to create headers
  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  // Helper function to handle response errors
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

  // Fetch bills with error handling and data mapping
  const fetchBills = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = isCustomer() ? CUSTOMER_BILLS_ENDPOINT : BILLS_ENDPOINT;
      const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (await handleResponseError(response)) return;
      const data = await response.json();

      if (isCustomer()) {
        if (data.customer && data.bills) {
          setBills(
            data.bills.map((bill: ExtendedBill) => ({
              ...bill,
              customerName: data.customer.name,
              customerAddress: data.customer.address,
            }))
          );
          setFilteredBills(
            data.bills.map((bill: ExtendedBill) => ({
              ...bill,
              customerName: data.customer.name,
              customerAddress: data.customer.address,
            }))
          );
        } else {
          setBills(Array.isArray(data) ? data : []);
          setFilteredBills(Array.isArray(data) ? data : []);
        }
      } else {
        if (Array.isArray(data)) {
          const mappedBills = data.map((bill: any) => ({
            ...bill,
            customerName: bill.customer?.name || 'N/A',
            customerAddress: bill.customer?.address || 'N/A',
          }));
          setBills(mappedBills);
          setFilteredBills(mappedBills);
        } else {
          setBills([]);
          setFilteredBills([]);
        }
      }
    } catch (err) {
      toast.error('Failed to fetch bills. Please try again.', { position: 'top-right', autoClose: 2000 });
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
    if (userInfo) fetchBills();
  }, [userInfo]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = bills.filter(
      (bill) =>
        bill.customerName?.toLowerCase().includes(term) ||
        bill.customerAddress?.toLowerCase().includes(term) ||
        bill.billMonth?.toLowerCase().includes(term) ||
        bill.billYear?.toString().includes(term)
    );
    setFilteredBills(filtered);
  };

  // Handle sorting
  const handleSort = (key: keyof ExtendedBill) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredBills].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredBills(sorted);
  };

  // Handle filter by month
  const handleFilterMonth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setFilterMonth(month);
    const filtered = month ? bills.filter((bill) => bill.billMonth?.toLowerCase() === month.toLowerCase()) : bills;
    setFilteredBills(filtered);
  };

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
      sessionId,
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
    const bill = bills.find((b) => b.billNo === billNo);
    if (!bill) {
      toast.error('Bill not found.', { position: 'top-right', autoClose: 2000 });
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
          setFilteredBills(filteredBills.filter((b) => b.billNo !== billNo));
          toast.success('Bill deleted successfully!', { position: 'top-right', autoClose: 2000 });
        } catch (err) {
          toast.error('Failed to delete bill. Please try again.', { position: 'top-right', autoClose: 2000 });
          console.error('Delete error:', err);
        } finally {
          setLoading(false);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
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

  // Month options for filter
  const monthOptions = [
    '',
   'Baisakh (बैशाख)',
    'Jestha (जेठ)',
    'Ashadh (असार)',
    'Shrawan (साउन)',
    'Bhadra (भदौ)',
    'Ashwin (असोज)',
    'Kartik (कार्तिक)',
    'Mangsir (मंसिर)',
    'Poush (पुष)',
    'Magh (माघ)',
    'Falgun (फागुन)',
    'Chaitra (चैत)',
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-blue-600" size={28} />
              Bill Management
            </h2>
            {!isCustomer() && (
              <button
                onClick={handleAddNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add New Bill
              </button>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by customer, address, month, or year..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              <select
                value={filterMonth}
                onChange={handleFilterMonth}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {monthOptions.map((month) => (
                  <option key={month || 'all'} value={month}>
                    {month || 'All Months'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading bills...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-16">
              <FiFileText className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No bills found.</p>
              {!isCustomer() && (
                <button
                  onClick={handleAddNew}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
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
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('billNo')}
                      >
                        Bill No {sortConfig.key === 'billNo' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      {isCustomer() ? (
                        <>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                            onClick={() => handleSort('billMonth')}
                          >
                            Bill Month {sortConfig.key === 'billMonth' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                          </th>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                            onClick={() => handleSort('billYear')}
                          >
                            Bill Year {sortConfig.key === 'billYear' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                          </th>
                        </>
                      ) : (
                        <>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                            onClick={() => handleSort('customerName')}
                          >
                            Customer Name {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer Address</th>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                            onClick={() => handleSort('billMonth')}
                          >
                            Bill Month {sortConfig.key === 'billMonth' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                          </th>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                            onClick={() => handleSort('billYear')}
                          >
                            Bill Year {sortConfig.key === 'billYear' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                          </th>
                        </>
                      )}
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('consumedUnit')}
                      >
                        Units Consumed {sortConfig.key === 'consumedUnit' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('totalBillAmount')}
                      >
                        Total Amount {sortConfig.key === 'totalBillAmount' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill, index) => (
                      <tr
                        key={bill.billNo}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{bill.billNo}</td>
                        {isCustomer() ? (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.billMonth}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.billYear}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.customerName}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.customerAddress}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.billMonth}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{bill.billYear}</td>
                          </>
                        )}
                        <td className="px-6 py-4 text-sm text-gray-900">{bill.consumedUnit?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">${bill.totalBillAmount?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEdit(bill)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover-scale transition-colors duration-200"
                              title="Edit Bill"
                              aria-label={`Edit bill ${bill.billNo}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            {!isCustomer() && (
                              <button
                                onClick={() => handleDelete(bill.billNo!)}
                                className="p-2 text-red-600 hover:text-red-800 hover-scale transition-colors duration-200"
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
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Bills: {filteredBills.length}
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