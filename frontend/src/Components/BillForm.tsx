import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUser, FiCalendar, FiZap, FiDollarSign, FiSend, FiFileText } from 'react-icons/fi';
import { HiOutlineCalculator } from 'react-icons/hi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Bill, Customer } from '../types/models';
import { getAuthToken } from '../utility/auth';
// import { isAdmin } from '../utility/auth';

interface Props {
  onSave: () => void;
}

const BillForm = ({ onSave }: Props) => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill>({
    cusId: 0,
    billDate: '',
    billMonth: '',
    billYear: new Date().getFullYear(),
    previousReading: 0,
    currentReading: 0,
    minimumCharge: 0,
    rate: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // useEffect(() => {
  //   if (!isAdmin()) {
  //     toast.error('Unauthorized access. Redirecting to login.');
  //     navigate('/unauthorized');
  //   }
  // }, [navigate]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('http://localhost:5008/api/Customers', {
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
    fetchCustomers();
  }, [navigate]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBill(prev => ({
      ...prev,
      [name]: ['rate', 'previousReading', 'currentReading', 'minimumCharge', 'billYear'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
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

    setLoading(true);
    try {
      const billData = {
        CusId: bill.cusId,
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

      console.log("JWT Token:", localStorage.getItem("authToken"));

      const response = await fetch('http://localhost:5008/api/Bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(billData)
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create bill');
      }

      await response.json();
      toast.success('Bill added successfully!');
      onSave();
      setBill({
        cusId: 0,
        billDate: '',
        billMonth: '',
        billYear: new Date().getFullYear(),
        previousReading: 0,
        currentReading: 0,
        minimumCharge: 0,
        rate: 0,
      });
      setSelectedCustomer(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create bill. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const consumedUnits = bill.currentReading - bill.previousReading;
  const totalAmount = bill.minimumCharge + (consumedUnits * bill.rate);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiFileText className="mr-2 h-8 w-8" />
          Create New Bill
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              label: 'Customer',
              name: 'cusId',
              type: 'custom',
              icon: <FiUser className="h-5 w-5 text-gray-700" />,
              required: true,
              colSpan: 'lg:col-span-2',
            },
            {
              label: 'Bill Date',
              name: 'billDate',
              type: 'date',
              icon: <FiCalendar className="h-5 w-5 text-gray-700" />,
              required: true,
            },
            {
              label: 'Bill Month',
              name: 'billMonth',
              type: 'select',
              icon: <FiCalendar className="h-5 w-5 text-gray-700" />,
              required: true,
              options: months.map(month => ({ value: month, label: month })),
            },
            {
              label: 'Bill Year',
              name: 'billYear',
              type: 'number',
              icon: <FiCalendar className="h-5 w-5 text-gray-700" />,
              required: false,
              min: '2000',
              max: '2100',
            },
            {
              label: 'Previous Reading',
              name: 'previousReading',
              type: 'number',
              icon: <FiZap className="h-5 w-5 text-gray-700" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Current Reading',
              name: 'currentReading',
              type: 'number',
              icon: <FiZap className="h-5 w-5 text-gray-700" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Minimum Charge',
              name: 'minimumCharge',
              type: 'number',
              icon: <FiDollarSign className="h-5 w-5 text-gray-700" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
            {
              label: 'Rate per Unit',
              name: 'rate',
              type: 'number',
              icon: <FiDollarSign className="h-5 w-5 text-gray-700" />,
              required: false,
              placeholder: '0.00',
              min: '0',
              step: '0.01',
            },
          ].map(({ label, name, type, icon, options, required, placeholder, min, max, step, colSpan }) => (
            <div key={name} className={`flex flex-col space-y-2 ${colSpan || ''}`}>
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              {type === 'custom' && name === 'cusId' ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={selectedCustomer ? `${selectedCustomer.cusId} - ${selectedCustomer.name} - ${selectedCustomer.address}` : searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedCustomer) setSelectedCustomer(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <div
                            key={customer.cusId}
                            onClick={() => handleCustomerSelect(customer)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
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
                  value={bill[name as keyof Bill]}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={required}
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
                  value={bill[name as keyof Bill]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={required}
                  min={min}
                  max={max}
                  step={step}
                />
              )}
            </div>
          ))}

          {/* Bill Summary */}
          <div className="lg:col-span-2 mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-center mb-4">
              <HiOutlineCalculator className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Bill Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{consumedUnits.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Units Consumed</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">${bill.rate.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Rate per Unit</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-purple-600">${totalAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="lg:col-span-2 flex justify-center mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Processing...' : 'Create Bill'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillForm;