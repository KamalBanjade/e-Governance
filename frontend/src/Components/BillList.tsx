import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiFileText, FiPlus, FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';
import { motion } from 'framer-motion';

interface ExtendedBill {
  billNo?: number;
  cusId?: number;
  billDate?: string;
  billMonth?: string;
  billYear?: number;
  previousReading?: number;
  currentReading?: number;
  minimumCharge?: number;
  rate?: number;
  consumedUnit?: number;
  totalBillAmount?: number;
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  customerName?: string;
  customerAddress?: string;
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
  branchId?: number; // Add branchId to UserInfo interface
}

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExtendedBill | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterMonth, setFilterMonth] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = getAuthToken();

  const decodeToken = (token: string): UserInfo | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'Admin',
        userTypeId: parseInt(payload.userTypeId || '1'),
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 'user-id',
        branchId: payload.branchId ? parseInt(payload.branchId) : undefined, // Extract branchId from token
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

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

  const isCustomer = (): boolean => userInfo?.role === 'Customer' || userInfo?.userTypeId === 3;
  const isClerk = (): boolean => userInfo?.role === 'Clerk' || userInfo?.userTypeId === 2;
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

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches`, {
        headers: getAuthHeaders(),
      });
      if (await handleResponseError(response)) return;
      const data = await response.json();
      console.log('Fetched branches:', data); // Debug log
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branch information', { position: 'bottom-right', autoClose: 3000 });
    }
  };

  const fetchBills = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const branchId = getUserBranchId();
      setUserBranchId(branchId);
      console.log('Current user branch ID:', branchId); // Debug log
      console.log('User info:', userInfo); // Debug log

      let url = BILLS_ENDPOINT;

      // Determine the appropriate endpoint based on user role and type
      if (isCustomer()) {
        url = CUSTOMER_BILLS_ENDPOINT;
      } else if (userInfo?.role === 'Clerk' || userInfo?.userTypeId === 2) {
        // Clerks should only see bills they created
        url = `${BILLS_ENDPOINT}/by-current-user`;
      } else if (isBranchAdmin() && branchId) {
        url = `${BILLS_ENDPOINT}/by-branch?branchId=${branchId}`;
      }
      // Admin users will use the default BILLS_ENDPOINT (all bills)

      console.log('Fetching from URL:', url); // Debug log

      const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (await handleResponseError(response)) return;
      const data = await response.json();

      if (isCustomer()) {
        if (data.customer && data.bills) {
          const mappedBills = data.bills.map((bill: ExtendedBill) => ({
            ...bill,
            customerName: data.customer.name,
            customerAddress: data.customer.address,
          }));
          setBills(mappedBills);
          setFilteredBills(mappedBills);
        } else {
          setBills(Array.isArray(data) ? data : []);
          setFilteredBills(Array.isArray(data) ? data : []);
        }
      } else {
        // For clerks, branch admins, and admins - all return the same format
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
      toast.error('Failed to fetch bills. Please try again.', { position: 'bottom-right', autoClose: 2000 });
      console.error('Fetch bills error:', err);
    } finally {
      setLoading(false);
    }
  };


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
    console.log('Decoded user info:', decoded); // Debug log
  }, [token, navigate, confirm]);

  useEffect(() => {
    if (userInfo) {
      const fetchInitialData = async () => {
        // Always fetch branches first (even for customers, in case they need it later)
        await fetchBranches();
        // Then set the branch ID and fetch bills
        const branchId = getUserBranchId();
        setUserBranchId(branchId);
        await fetchBills();
      };
      fetchInitialData();
    }
  }, [userInfo]);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useEscapeKey(() => setIsDropdownOpen(false));

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setIsDropdownOpen(true);
    const filtered = bills.filter(
      (bill) =>
        bill.customerName?.toLowerCase().includes(term) ||
        bill.customerAddress?.toLowerCase().includes(term) ||
        bill.billMonth?.toLowerCase().includes(term) ||
        bill.billYear?.toString().includes(term) ||
        bill.billNo?.toString().includes(term)
    );
    setFilteredBills(filtered);
  };

  const handleSort = (key: keyof ExtendedBill) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredBills].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (key === 'billMonth') {
        const monthOrder = [
          'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
          'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
        ];
        const aIndex = monthOrder.indexOf(a[key] as string);
        const bIndex = monthOrder.indexOf(b[key] as string);
        return direction === 'asc' ? aIndex - bIndex : bIndex - aIndex;
      }
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredBills(sorted);
  };

  const handleFilterMonth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setFilterMonth(month);
    const filtered = month ? bills.filter((bill) => bill.billMonth?.toLowerCase() === month.toLowerCase()) : bills;
    setFilteredBills(filtered);
  };

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

  const handleEdit = (bill: ExtendedBill) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(bill);
    navigate('/billform?edit=true');
  };

  const handleDelete = async (billNo: number) => {
    const bill = bills.find((b) => b.billNo === billNo);
    if (!bill) {
      toast.error('Bill not found.', { position: 'bottom-right', autoClose: 2000 });
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
          toast.success('Bill deleted successfully!', { position: 'bottom-right', autoClose: 2000 });
        } catch (err) {
          toast.error('Failed to delete bill. Please try again.', { position: 'bottom-right', autoClose: 2000 });
          console.error('Delete error:', err);
        } finally {
          setLoading(false);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/billform?new=true');
  };

  const getCurrentUserBranchName = (): string => {
    console.log('Getting branch name for ID:', userBranchId, 'from branches:', branches); // Debug log

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

    // If branch not found, show more helpful message
    return `Branch ID: ${userBranchId} (Not Found)`;
  };

  const getPageTitle = (): string => {
    if (isCustomer()) {
      return 'My Bills';
    }
    if (isClerk()) {
      return 'My Created Bills';
    }
    if (isBranchAdmin()) {
      return `Bill Directory - ${getCurrentUserBranchName()}`;
    }
    return 'Bill Directory';
  };

  const getPageDescription = (): string => {
    if (isCustomer()) {
      return 'View and manage your billing records';
    }
    if (isClerk()) {
      return 'View and manage bills you have created';
    }
    if (isBranchAdmin()) {
      const branchName = getCurrentUserBranchName();
      if (branchName === 'Loading Branch...' || branchName === 'No Branch Assigned') {
        return 'Manage bills for your branch';
      }
      return `Manage bills in ${branchName} branch`;
    }
    return 'Manage your billing records efficiently';
  };

  const monthOptions = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

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
            {(!isCustomer()) && (
              <motion.button
                whileHover={{ scale: 1.01, translateY: -4 }}
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform"
              >
                <FiPlus className="mr-2" />
                Add New Bill
              </motion.button>
            )}
          </motion.div>

          {/* Search and Filter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 transition-all duration-300 hover:shadow-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Enhanced Search Input with Dropdown */}
              <div className="col-span-2 relative" ref={dropdownRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search bills by customer, address, month, or bill number..."
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 placeholder-gray-400 text-gray-700"
                    value={searchTerm}
                    onChange={handleSearch}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsDropdownOpen(false);
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilteredBills(bills);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  )}
                  {isDropdownOpen && filteredBills.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredBills.map((bill) => (
                        <motion.div
                          key={bill.billNo}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          onClick={() => {
                            setSearchTerm(`${bill.customerName} (${bill.billNo})`);
                            setFilteredBills([bill]);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{bill.customerName}</div>
                          <div className="text-sm text-gray-600">Bill No: {bill.billNo}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {bill.billMonth} {bill.billYear} • रु. {bill.totalBillAmount?.toFixed(2) || '0.00'}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Month Filter */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <select
                    value={filterMonth}
                    onChange={handleFilterMonth}
                    className="appearance-none block w-full pl-3 pr-10 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 text-gray-700 bg-white cursor-pointer"
                  >
                    <option value="">All Months</option>
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <FiChevronDown className="h-5 w-5" />
                  </div>
                </div>
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
                  <h3 className="text-lg font-medium text-gray-800">Loading bill data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </motion.div>
          ) : filteredBills.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100"
            >
              <FiFileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No bills found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm
                  ? 'Try adjusting your search query'
                  : isClerk()
                    ? 'You haven\'t created any bills yet'
                    : isBranchAdmin()
                      ? `Your bill list is currently empty for ${getCurrentUserBranchName()} branch`
                      : 'Your bill list is currently empty'
                }
              </p>
              {!isCustomer() && (
                <motion.button
                  whileHover={{ scale: 1.01, translateY: -4 }}
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl mx-auto"
                >
                  <FiPlus className="mr-2" />
                  Add New Bill
                </motion.button>
              )}
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
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('billNo')}
                      >
                        Bill No
                        {sortConfig.key === 'billNo' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      {!isCustomer() && (
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('customerName')}
                        >
                          Customer
                          {sortConfig.key === 'customerName' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('billMonth')}
                      >
                        Bill Period
                        {sortConfig.key === 'billMonth' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('consumedUnit')}
                      >
                        Units Consumed
                        {sortConfig.key === 'consumedUnit' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalBillAmount')}
                      >
                        Amount
                        {sortConfig.key === 'totalBillAmount' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBills.map((bill, index) => (
                      <motion.tr
                        key={bill.billNo}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{bill.billNo}</td>
                        {!isCustomer() && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                                {bill.customerName?.charAt(0) || 'N'}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{bill.customerName}</div>
                                <div className="text-sm text-gray-500">{bill.customerAddress}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{bill.billMonth}</div>
                          <div className="text-sm text-gray-500">{bill.billYear}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.consumedUnit?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">रु. {bill.totalBillAmount?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(bill)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            {(!isCustomer()) && (
                              <button
                                onClick={() => handleDelete(bill.billNo!)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center"
              >
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Showing <span className="font-medium">{filteredBills.length}</span> of{' '}
                  <span className="font-medium">{bills.length}</span> bills
                </div>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                    Previous
                  </button>
                  <button className="px-4 py-2 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Next
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default BillList;