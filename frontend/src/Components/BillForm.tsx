import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiUser, FiCalendar, FiZap, FiDollarSign, FiSend, FiFileText, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { HiOutlineCalculator } from 'react-icons/hi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Bill, Customer } from '../types/models';
import { getAuthToken } from '../utility/auth';
import { useDialog } from '../Contexts/DialogContext';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';

interface Props {
  onSave: () => void;
}

interface UserInfo {
  role: string;
  userTypeId: number;
  userId: string;
  branchId: number;
}

interface ExtendedBill extends Bill {
  billNo?: number;
  consumedUnit?: number;
  totalBillAmount?: number;
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  status?: string;
}

interface NepaliDate {
  year: number;
  month: string;
  day: number;
  formatted: string;
}

const EDIT_DATA_KEY = 'editBillData';
const EDIT_MODE_KEY = 'isEditBillOperation';

const BillForm = ({ onSave }: Props) => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();

  const nepaliMonths = [
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

  // Get current Nepali date from backend
  const [nepaliDate, setNepaliDate] = useState<NepaliDate>({
    year: new Date().getFullYear() + 57, // Fallback
    month: 'Baisakh',
    day: 1,
    formatted: ''
  });

  const [bill, setBill] = useState<ExtendedBill>(() => ({
    cusId: 0,
    billDate: new Date().toISOString().split('T')[0],
    billMonth: nepaliDate.month,
    billYear: nepaliDate.year,
    previousReading: 0,
    currentReading: 0,
    minimumCharge: 0,
    rate: 0,
    consumedUnit: 0,
    totalBillAmount: 0,
  }));

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [customerBills, setCustomerBills] = useState<ExtendedBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<ExtendedBill | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useEscapeKey(() => setIsDropdownOpen(false));

  const decodeToken = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role,
        userTypeId: parseInt(payload.userTypeId || '0'),
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub,
        branchId: parseInt(payload.branchId || '0'), // Extract branchId from JWT
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const isCustomer = () => {
    return userInfo && (userInfo.role === 'Customer' || userInfo.userTypeId === 3);
  };

  useEffect(() => {
    const fetchNepaliDate = async () => {
      try {
        const response = await fetch('http://localhost:5008/api/Bills/current-nepali-date', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch Nepali date: ${response.status}`);
        }

        const data: NepaliDate = await response.json();
        setNepaliDate(data);
        setBill(prev => ({
          ...prev,
          billDate: new Date().toISOString().split('T')[0], // Keep Gregorian date for billDate
          billMonth: data.month,
          billYear: data.year,
        }));
      } catch (error) {
        console.error('Failed to fetch Nepali date:', error);
        toast.error('Failed to load Nepali date. Using approximate date.');
        // Fallback to approximate date
        const now = new Date();
        const fallbackYear = now.getFullYear() + 57;
        const monthIndex = now.getMonth();
        const fallbackMonth = nepaliMonths[monthIndex] || 'Baisakh';
        setNepaliDate({
          year: fallbackYear,
          month: fallbackMonth,
          day: now.getDate(),
          formatted: `${fallbackYear}/${monthIndex + 1}/${now.getDate()} (${fallbackMonth})`
        });
      }
    };

    if (token) {
      fetchNepaliDate();
    }
  }, [token, navigate]);

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

    const params = new URLSearchParams(location.search);
    const editMode = params.get('edit') === 'true';
    setIsEditMode(editMode);

    if (editMode) {
      const editData = localStorage.getItem(EDIT_DATA_KEY);
      if (editData) {
        const billData = JSON.parse(editData);
        setBill({
          billNo: billData.billNo,
          cusId: billData.cusId,
          billDate: billData.billDate ? new Date(billData.billDate).toISOString().split('T')[0] : '',
          billMonth: billData.billMonth,
          billYear: billData.billYear,
          previousReading: billData.previousReading,
          currentReading: billData.currentReading,
          minimumCharge: billData.minimumCharge,
          rate: billData.rate,
          consumedUnit: billData.consumedUnit,
          totalBillAmount: billData.totalBillAmount,
        });
      }
    }
  }, [token, location, navigate, confirm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isCustomer()) {
          await fetchCustomerBillsWithDetails();
        } else {
          // BranchId is already available in userInfo from JWT token
          await fetchAllCustomers();

          if (isEditMode && bill.cusId) {
            await fetchCustomerById(bill.cusId);
          }
        }
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setInitialDataLoaded(true);
      }
    };

    if (userInfo) {
      fetchData();
    }
  }, [userInfo, isEditMode, bill.cusId]);

  const fetchAllCustomers = async () => {
    try {
      // Get user info from decoded JWT token
      const role = userInfo?.role;
      const userId = userInfo?.userId;
      const branchId = userInfo?.branchId;

      let url;

      // Admin (userId === '1' OR role === 'Admin') gets all customers
      if (userId === '1' || role === 'Admin') {
        url = 'http://localhost:5008/api/Customers';
      }
      // Other roles (Clerk, BranchAdmin) get only customers from their branch
      else if (branchId && branchId > 0) {
        url = `http://localhost:5008/api/Customers/by-branch?branchId=${branchId}`;
      }
      // Fallback to all customers if no branch info
      else {
        url = 'http://localhost:5008/api/Customers';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      toast.error('Failed to load customers. Please try again.');
      console.error('Failed to load customers:', err);
    }
  };


  const fetchCustomerById = async (cusId: number) => {
    try {
      const response = await fetch(`http://localhost:5008/api/Customers/${cusId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setSelectedCustomer(data);
    } catch (err) {
      toast.error('Failed to load customer data. Please try again.');
      console.error('Failed to load customer:', err);
    }
  };

  const fetchCustomerBillsWithDetails = async () => {
    try {
      const url = `http://localhost:5008/api/Bills/customer-bills-with-details`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setSelectedCustomer(data.customer);
      const unpaidBills = data.bills.filter(
        (bill: ExtendedBill) => bill.status?.toLowerCase() === 'unpaid' || bill.status?.toLowerCase() === 'pending'
      );
      setCustomerBills(unpaidBills);

      if (unpaidBills.length > 0 && !isEditMode) {
        const latestBill = unpaidBills[0];
        setSelectedBill(latestBill);
        setBill({
          ...latestBill,
          billDate: latestBill.billDate ? new Date(latestBill.billDate).toISOString().split('T')[0] : '',
        });
      } else if (!isEditMode) {
        setBill(prev => ({ ...prev, cusId: data.customer.cusId }));
      }
    } catch (err) {
      toast.error('Failed to load your bills. Please try again.');
      console.error('Failed to load bills:', err);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBill(prev => ({ ...prev, cusId: customer.cusId }));
    setSearchTerm('');
    setIsDropdownOpen(false);
  };
  const handleCustomerSearch = () => {
    if (!isCustomer()) {
      // Customers are already filtered by branch when fetched
      setIsDropdownOpen(true);
    }
  };

  const handleBillSelect = (selectedBill: ExtendedBill) => {
    setSelectedBill(selectedBill);
    setBill({
      ...selectedBill,
      billDate: selectedBill.billDate ? new Date(selectedBill.billDate).toISOString().split('T')[0] : '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBill(prev => {
      const updatedBill = {
        ...prev,
        [name]: ['rate', 'previousReading', 'currentReading', 'minimumCharge', 'billYear'].includes(name)
          ? parseFloat(value) || 0
          : value,
      };

      if (!isCustomer()) {
        updatedBill.consumedUnit = updatedBill.currentReading - updatedBill.previousReading;
        updatedBill.totalBillAmount = updatedBill.minimumCharge + (updatedBill.consumedUnit * updatedBill.rate);
      }

      return updatedBill;
    });
  };

  const validateForm = () => {
    const { cusId, billDate, billMonth } = bill;
    if (!cusId || !billDate || !billMonth) {
      toast.error('Please fill in all required fields.');
      return false;
    }
    if (bill.currentReading < bill.previousReading) {
      toast.error('Current reading cannot be less than previous reading.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const finalAmount = bill.totalBillAmount || (bill.minimumCharge + ((bill.currentReading - bill.previousReading) * bill.rate));

    confirm(
      isEditMode ? 'Confirm Bill Update' : 'Confirm Bill Creation',
      `Are you sure you want to ${isEditMode ? 'update' : 'create'} a bill for ${selectedCustomer?.name || 'the selected customer'} with total amount रु. ${finalAmount.toFixed(2)}?`,
      async () => {
        setLoading(true);
        try {
          const billData = {
            billNo: bill.billNo,
            cusId: bill.cusId,
            billDate: new Date(bill.billDate).toISOString().split('T')[0],
            billMonth: bill.billMonth,
            billYear: bill.billYear,
            previousReading: bill.previousReading,
            currentReading: bill.currentReading,
            minimumCharge: bill.minimumCharge,
            rate: bill.rate,
          };

          if (!token) {
            toast.error('You are not logged in. Please login again.');
            navigate('/login');
            return;
          }

          const url = isEditMode ? `http://localhost:5008/api/Bills/${bill.billNo}` : 'http://localhost:5008/api/Bills';
          const method = isEditMode ? 'PUT' : 'POST';

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(billData),
          });

          if (response.status === 401) {
            toast.error('You are not authorized. Please log in.');
            navigate('/login');
            return;
          }

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || `Failed to ${isEditMode ? 'update' : 'create'} bill`);
          }

          await response.json();
          toast.success(`Bill ${isEditMode ? 'updated' : 'added'} successfully!`);
          localStorage.removeItem(EDIT_DATA_KEY);
          localStorage.removeItem(EDIT_MODE_KEY);
          localStorage.removeItem('editBillTimestamp');
          localStorage.removeItem('editBillSessionId');
          onSave();

          // Reset form with current Nepali date
          setBill({
            cusId: 0,
            billDate: new Date().toISOString().split('T')[0],
            billMonth: nepaliDate.month,
            billYear: nepaliDate.year,
            previousReading: 0,
            currentReading: 0,
            minimumCharge: 0,
            rate: 0,
            consumedUnit: 0,
            totalBillAmount: 0,
          });
          setSelectedCustomer(null);
          navigate('/billlist');
        } catch (err: any) {
          toast.error(err.message || `Failed to ${isEditMode ? 'update' : 'create'} bill. Please try again.`);
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      {
        type: 'success',
        confirmText: isEditMode ? 'Update Bill' : 'Create Bill',
        cancelText: 'Cancel',
        showCancel: true,
      }
    );
  };

  const handleProceedToPayment = () => {
    if (!selectedBill) {
      toast.error('Please select a bill to proceed with payment.');
      return;
    }

    toast.info(`Proceeding to payment for bill ${selectedBill.billNo}...`, { autoClose: 2000 });
    navigate('/PaymentForm', { state: { bill: selectedBill, customer: selectedCustomer } });
    setSelectedBill(null);
  };

  const consumedUnits = bill.consumedUnit || (bill.currentReading - bill.previousReading);
  const totalAmount = bill.totalBillAmount || (bill.minimumCharge + (consumedUnits * bill.rate));

  if (!initialDataLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-10 bg-gradient-to-br from-blue-200 via-white to-indigo-200 rounded-3xl shadow-2xl mt-10 border border-blue-200">
        <h2 className="text-4xl font-extrabold text-green-400 text-center mb-10 flex items-center justify-center tracking-tight">
          <FiFileText className="mr-3 h-9 w-9 text-green-700" />
          {isEditMode ? 'Edit Bill' : isCustomer() ? 'Your Electric Bill' : 'Create New Bill'}
        </h2>

        {isCustomer() && (
          <div className="mb-8 p-6 bg-gradient-to-r from-green-50 via-blue-50 to-white rounded-2xl border border-green-200 shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Available Bills</h3>
            {customerBills.length > 0 ? (
              <select
                value={selectedBill?.billNo || ''}
                onChange={(e) => {
                  const bill = customerBills.find(b => b.billNo === parseInt(e.target.value));
                  if (bill) handleBillSelect(bill);
                }}
                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white shadow-sm"
              >
                <option value="">Select a bill to view</option>
                {customerBills.map(bill => (
                  <option key={bill.billNo} value={bill.billNo}>
                    {bill.billMonth} {bill.billYear} — रु. {bill.totalBillAmount?.toFixed(2)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-gray-500 flex items-center justify-center p-4 rounded-md border border-dashed border-gray-300 bg-white shadow-sm">
                <FiAlertCircle className="mr-2 h-5 w-5 text-gray-400" />
                No unpaid bills found for your account.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              label: 'Customer',
              name: 'cusId',
              type: 'custom',
              icon: <FiUser className="h-5 w-5 text-indigo-600" />,
              required: true,
              colSpan: 'lg:col-span-2',
            },
            {
              label: 'Bill Date',
              name: 'billDate',
              type: 'date',
              icon: <FiCalendar className="h-5 w-5 text-indigo-600" />,
              required: true,
              disabled: !isEditMode,
            },
            {
              label: 'Bill Month',
              name: 'billMonth',
              type: 'select',
              icon: <FiCalendar className="h-5 w-5 text-indigo-600" />,
              required: true,
              options: nepaliMonths.map(month => ({ value: month, label: `${month}` })),
              // disabled: !isEditMode,
            },
            {
              label: 'Bill Year',
              name: 'billYear',
              type: 'number',
              icon: <FiCalendar className="h-5 w-5 text-indigo-600" />,
              required: false,
              min: '2000',
              max: '2100',
              disabled: !isEditMode,
            },
            {
              label: 'Previous Reading',
              name: 'previousReading',
              type: 'number',
              icon: <FiZap className="h-5 w-5 text-orange-500" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Current Reading',
              name: 'currentReading',
              type: 'number',
              icon: <FiZap className="h-5 w-5 text-orange-500" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Minimum Charge',
              name: 'minimumCharge',
              type: 'number',
              icon: <FiDollarSign className="h-5 w-5 text-green-600" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Rate per Unit',
              name: 'rate',
              type: 'number',
              icon: <FiDollarSign className="h-5 w-5 text-green-600" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
          ].map(({ label, name, type, icon, options, required, placeholder, min, max, step, colSpan, disabled }) => (
            <div key={name} className={`flex flex-col space-y-2 ${colSpan || ''}`}>
              <label className="flex items-center text-gray-700 font-semibold">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
                {disabled && !isEditMode && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Auto-filled</span>
                )}
              </label>
              {type === 'custom' && name === 'cusId' ? (
                <div className="relative" ref={dropdownRef}>
                  <input
                    type="text"
                    placeholder={isCustomer() ? "Your customer information" : "Search customers..."}
                    value={selectedCustomer ? `${selectedCustomer.cusId} - ${selectedCustomer.name} - ${selectedCustomer.address}` : searchTerm}
                    onChange={(e) => {
                      if (!isCustomer()) {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        if (selectedCustomer) setSelectedCustomer(null);
                      }
                    }}
                    onFocus={() => handleCustomerSearch()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50 shadow-sm"
                    readOnly={!!isCustomer() || userInfo === null}
                  />
                  <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  {isDropdownOpen && !isCustomer() && !isEditMode && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <div
                            key={customer.cusId}
                            onClick={() => handleCustomerSelect(customer)}
                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.address}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">No customers found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : type === 'select' ? (
                <select
                  name={name}
                  value={bill[name as keyof ExtendedBill] || ''}
                  onChange={handleChange}
                  className={`p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 w-full shadow-sm ${disabled ? 'bg-blue-50 cursor-not-allowed' : 'bg-white'
                    }`}
                  required={required}
                  disabled={disabled || !!isCustomer() || userInfo === null}
                >
                  <option value="">Select {label}</option>
                  {options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  name={name}
                  value={bill[name as keyof ExtendedBill] || ''}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className={`p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 w-full shadow-sm ${disabled ? 'bg-blue-50 cursor-not-allowed' : 'bg-white'
                    }`}
                  required={required}
                  min={min}
                  max={max}
                  step={step}
                  disabled={disabled || !!isCustomer() || userInfo === null}
                  readOnly={!!isCustomer() || userInfo === null}
                />
              )}
            </div>
          ))}

          <div className="lg:col-span-2 mt-10 p-6 bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 rounded-2xl border border-blue-100 shadow-inner">
            <div className="flex items-center mb-5">
              <HiOutlineCalculator className="h-6 w-6 text-white mr-2" />
              <h3 className="text-xl font-bold text-gray-800">Bill Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="text-center p-5 bg-white rounded-xl shadow">
                <div className="text-2xl font-bold text-blue-600">{consumedUnits.toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Units Consumed</div>
              </div>
              <div className="text-center p-5 bg-white rounded-xl shadow">
                <div className="text-2xl font-bold text-green-600">रु. {(bill.rate || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Rate per Unit</div>
              </div>
              <div className="text-center p-5 bg-white rounded-xl shadow">
                <div className="text-2xl font-bold text-purple-600">रु. {totalAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Total Amount</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-center mt-10">
            {isCustomer() ? (
              <button
                onClick={handleProceedToPayment}
                disabled={!selectedBill}
                className={`px-10 py-3 rounded-xl text-white font-semibold transition duration-300 flex items-center justify-center ${!selectedBill
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-md'
                  }`}
              >
                <FiCreditCard className="h-5 w-5 mr-2" />
                Proceed to Payment
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-10 py-3 rounded-xl text-white font-semibold transition duration-300 flex items-center justify-center ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-md'
                  }`}
              >
                <FiSend className="h-5 w-5 mr-2" />
                {loading ? 'Processing...' : isEditMode ? 'Update Bill' : 'Create Bill'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BillForm;