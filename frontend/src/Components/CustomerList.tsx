import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import type { Customer, Branch, DemandType } from '../types/models';
import { getAuthToken } from '../utility/auth';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';
import { motion } from 'framer-motion';

interface ApiCustomer extends Omit<Customer, 'demandType'> {
  demandType: string | DemandType;
  registrationMonth: string;
  registrationYear: number;
}

const EDIT_DATA_KEY = 'editCustomerData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const isCustomer = (): boolean => {
  const role = localStorage.getItem('userRole');
  return role === 'Customer';
};

const isBranchAdmin = (): boolean => {
  const role = localStorage.getItem('userRole');
  return role === 'BranchAdmin';
};


const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApiCustomer | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterDemandType, setFilterDemandType] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = getAuthToken();

  // Get user's branch ID for BranchAdmin
  const getUserBranchId = (): number | null => {
    const branchId = localStorage.getItem('userBranchId');
    return branchId ? parseInt(branchId, 10) : null;
  };

const fetchData = async () => {
  try {
    if (!token) {
      toast.error('Authentication Required: You need to login to access this page.', {
        position: 'bottom-right',
        autoClose: 2000,
        onClose: () => navigate('/login'),
      });
      return;
    }

    const userRole = localStorage.getItem('userRole');
    const userBranchId = getUserBranchId();

    // Debugging logs - add these
    console.log('Current user role:', userRole);
    console.log('Current branch ID:', userBranchId);

    // Determine the customer API endpoint based on user role
    let customerEndpoint = 'http://localhost:5008/api/customers';
    if (userRole === 'BranchAdmin') {
      if (!userBranchId) {
        console.error('BranchAdmin detected but no branchId found');
        toast.error('Branch information not found. Please contact admin.');
        return;
      }
      customerEndpoint = `http://localhost:5008/api/customers/by-branch?branchId=${userBranchId}`;
    }

    console.log('Using endpoint:', customerEndpoint); // Add this debug log

    const [customerResponse, branchResponse, demandTypeResponse] = await Promise.all([
      fetch(customerEndpoint, { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
      fetch('http://localhost:5008/api/customers/branches', { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
      fetch('http://localhost:5008/api/customers/demandtypes', { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
    ]);

      if (!customerResponse.ok || !branchResponse.ok || !demandTypeResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [customerData, branchData, demandTypeData] = await Promise.all([
        customerResponse.json(),
        branchResponse.json(),
        demandTypeResponse.json(),
      ]);

      const normalizedCustomers = customerData.map((customer: ApiCustomer) => ({
        ...customer,
        registrationMonth: customer.registrationMonth || 'Unknown',
        registrationYear: customer.registrationYear || 0,
      }));

      setCustomers(normalizedCustomers);
      setFilteredCustomers(normalizedCustomers);
      setBranches(branchData);
      setDemandTypes(demandTypeData);
    } catch (error) {
      toast.error('Failed to load customer data. Please try again later.', {
        position: 'bottom-right',
        autoClose: 2000,
        onClose: () => window.location.reload(),
      });
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, token]);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useEscapeKey(() => setIsDropdownOpen(false));

  const saveEditSession = (customer: ApiCustomer) => {
    const sessionId = uuidv4();
    const editData = {
      ...customer,
      demandType: typeof customer.demandType === 'object' ? customer.demandType.name : customer.demandType,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setIsDropdownOpen(true);
    const filtered = customers.filter(
      (customer) =>
        customer.scNo?.toLowerCase().includes(term) ||
        customer.name?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term) ||
        getDemandTypeName(customer).toLowerCase().includes(term) ||
        customer.registrationMonth?.toLowerCase().includes(term) ||
        customer.registrationYear?.toString().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const handleSort = (key: keyof ApiCustomer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredCustomers].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (key === 'registrationMonth') {
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
    setFilteredCustomers(sorted);
  };

  const handleFilterDemandType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setFilterDemandType(type);
    const filtered = type
      ? customers.filter((customer) => getDemandTypeName(customer).toLowerCase() === type.toLowerCase())
      : customers;
    setFilteredCustomers(filtered);
  };

  const handleDelete = (cusId: number) => {
    confirm(
      'Delete Customer',
      'Are you sure you want to delete this customer? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`http://localhost:5008/api/customers/${cusId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Failed to delete customer');
          setCustomers(customers.filter((customer) => customer.cusId !== cusId));
          setFilteredCustomers(filteredCustomers.filter((customer) => customer.cusId !== cusId));
          toast.success('Customer deleted successfully!', { position: 'bottom-right', autoClose: 2000 });
        } catch (error) {
          toast.error('Failed to delete customer. Please try again.', { position: 'bottom-right', autoClose: 2000 });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleEdit = (customer: ApiCustomer) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(customer);
    navigate('/Customers/create?edit=true');
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/Customers/create?new=true');
  };

  const getDemandTypeName = (customer: ApiCustomer): string => {
    if (typeof customer.demandType === 'string') return customer.demandType;
    if (customer.demandType && typeof customer.demandType === 'object' && 'name' in customer.demandType) {
      return customer.demandType.name;
    }
    return 'Unknown';
  };

  // Get the current user's branch name for display
  const getCurrentUserBranchName = (): string => {
    const userBranchId = getUserBranchId();
    if (userBranchId) {
      const branch = branches.find(b => b.branchId === userBranchId);
      return branch ? branch.name : 'Unknown Branch';
    }
    return 'All Branches';
  };

  const getPageTitle = (): string => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'BranchAdmin') {
      return `Customer Directory - ${getCurrentUserBranchName()}`;
    }
    return 'Customer Directory';
  };

  const getPageDescription = (): string => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'BranchAdmin') {
      return `Manage customers in ${getCurrentUserBranchName()} branch`;
    }
    return 'Manage your customer database efficiently';
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
                  <FiUsers className="text-blue-600 text-2xl" />
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
            {!isCustomer() && (
              <motion.button
                whileHover={{ scale: 1.01, translateY: -4 }}
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform"
              >
                <FiPlus className="mr-2" />
                Add New Customer
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
                    placeholder="Search customers by SC No, name, address, or demand type..."
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
                        setFilteredCustomers(customers);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  )}
                  {isDropdownOpen && filteredCustomers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredCustomers.map((customer) => (
                        <motion.div
                          key={customer.cusId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          onClick={() => {
                            setSearchTerm(`${customer.name} (${customer.scNo})`);
                            setFilteredCustomers([customer]);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.scNo}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getDemandTypeName(customer)} • {branches.find(b => b.branchId === customer.registeredBranchId)?.name || 'N/A'}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Demand Type Filter */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <select
                    value={filterDemandType}
                    onChange={handleFilterDemandType}
                    className="appearance-none block w-full pl-3 pr-10 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 text-gray-700 bg-white cursor-pointer"
                  >
                    <option value="">All Demand Types</option>
                    {demandTypes.map((type) => (
                      <option key={type.demandTypeId} value={type.name}>
                        {type.name}
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
                  <h3 className="text-lg font-medium text-gray-800">Loading customer data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </motion.div>
          ) : filteredCustomers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100"
            >
              <FiUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No customers found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm ? 'Try adjusting your search query' : `Your customer list is currently empty${isBranchAdmin() ? ` for ${getCurrentUserBranchName()} branch` : ''}`}
              </p>
              {!isCustomer() && (
                <motion.button
                  whileHover={{ scale: 1.01, translateY: -4 }}
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl mx-auto"
                >
                  <FiPlus className="mr-2" />
                  Add New Customer
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
                        onClick={() => handleSort('name')}
                      >
                        Customer
                        {sortConfig.key === 'name' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('demandType')}
                      >
                        Demand Type
                        {sortConfig.key === 'demandType' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('registeredBranchId')}
                      >
                        Branch
                        {sortConfig.key === 'registeredBranchId' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('mobileNo')}
                      >
                        Contact
                        {sortConfig.key === 'mobileNo' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('registrationMonth')}
                      >
                        Registration
                        {sortConfig.key === 'registrationMonth' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.map((customer, index) => (
                      <motion.tr
                        key={customer.cusId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.scNo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {getDemandTypeName(customer)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branches.find(b => b.branchId === customer.registeredBranchId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.mobileNo}</div>
                          <div className="text-sm text-gray-500">{new Date(customer.dob).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.registrationMonth}</div>
                          <div className="text-sm text-gray-500">{customer.registrationYear}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(customer)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.cusId)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default CustomerList;