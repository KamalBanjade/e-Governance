/* REPLACE */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';
import { motion } from 'framer-motion';


interface Branch {
  branchId: number;
  name: string;
}

interface Employee {
  empId: number;
  name: string;
  contactNo: string;
  status: string;
  branchId: number;
  employeeTypeId: number;
  userId: string; // This is what API returns
  branchName: string; // API includes this
  employeeTypeName: string; // API includes this
  email: string;
  username: string;
  address: string;
  dob: string;
  userTypeId: number;
}

const EDIT_DATA_KEY = 'editEmployeeData';
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

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = getAuthToken();

const getUserBranchId = (): number | null => {
  // Try all possible keys that might store the branch ID
  const possibleKeys = ['userBranchId', 'branchId', 'currentBranchId'];
  
  for (const key of possibleKeys) {
    const branchId = localStorage.getItem(key);
    if (branchId && !isNaN(Number(branchId))) {
      return parseInt(branchId, 10);
    }
  }

  // If no valid branch ID found, check the user object
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

  console.warn('No valid branch ID found in localStorage');
  return null;
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
    console.log('Current user role:', userRole);
    console.log('Current branch ID:', userBranchId);

    let employeeEndpoint = 'http://localhost:5008/api/employeedetails';
    if (userRole === 'BranchAdmin' && userBranchId) {
      employeeEndpoint = `http://localhost:5008/api/employeedetails/by-branch?branchId=${userBranchId}`;
    }

    console.log('Using endpoint:', employeeEndpoint);

    const [employeeResponse, branchResponse] = await Promise.all([
      fetch(employeeEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch('http://localhost:5008/api/employeedetails/branches', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    if (!employeeResponse.ok) throw new Error(`Failed to fetch employee data: ${employeeResponse.status}`);
    if (!branchResponse.ok) throw new Error(`Failed to fetch branch data: ${branchResponse.status}`);

    const [employeeData, branchData] = await Promise.all([
      employeeResponse.json(),
      branchResponse.json(),
    ]);

    setEmployees(Array.isArray(employeeData) ? employeeData : []);
    setFilteredEmployees(Array.isArray(employeeData) ? employeeData : []);
    setBranches(branchData);
  } catch (error) {
    console.error('Detailed fetch error:', error);
    toast.error('Failed to load employee data. Please try again later.', {
      position: 'bottom-right',
      autoClose: 2000,
    });
  } finally {
    setLoading(false);
  }
};


// Updated search function to work with the actual API response structure
const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  const term = e.target.value.toLowerCase();
  setSearchTerm(term);
  setIsDropdownOpen(true);
  const filtered = employees.filter(
    (employee) =>
      employee.username?.toLowerCase().includes(term) ||
      employee.name?.toLowerCase().includes(term) ||
      employee.email?.toLowerCase().includes(term) ||
      employee.address?.toLowerCase().includes(term) ||
      employee.contactNo?.toLowerCase().includes(term) ||
      employee.status?.toLowerCase().includes(term) ||
      employee.branchName?.toLowerCase().includes(term) || // Use branchName from API
      employee.employeeTypeName?.toLowerCase().includes(term) // Use employeeTypeName from API
  );
  setFilteredEmployees(filtered);
};

  useEffect(() => {
    fetchData();
  }, [navigate, token]);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useEscapeKey(() => setIsDropdownOpen(false));

  const saveEditSession = (employee: Employee) => {
    const sessionId = uuidv4();
    const editData = {
      ...employee,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };
  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredEmployees].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (key === 'dob') {
        const aDate = new Date(a[key] as string);
        const bDate = new Date(b[key] as string);
        return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredEmployees(sorted);
  };

  const handleFilterStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setFilterStatus(status);
    const filtered = status
      ? employees.filter((employee) => employee.status.toLowerCase() === status.toLowerCase())
      : employees;
    setFilteredEmployees(filtered);
  };

  const handleDelete = (empId: number) => {
    confirm(
      'Delete Employee',
      'Are you sure you want to delete this employee? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`http://localhost:5008/api/employeedetails/${empId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Failed to delete employee');
          setEmployees(employees.filter((employee) => employee.empId !== empId));
          setFilteredEmployees(filteredEmployees.filter((employee) => employee.empId !== empId));
          toast.success('Employee deleted successfully!', { position: 'bottom-right', autoClose: 2000 });
        } catch (error) {
          toast.error('Failed to delete employee. Please try again.', { position: 'bottom-right', autoClose: 2000 });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleEdit = (employee: Employee) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(employee);
    navigate('/Employees/create?edit=true'); // Adjust path if necessary
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/Employees/create?new=true'); // Adjust path if necessary
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
      return `Employee Directory - ${getCurrentUserBranchName()}`;
    }
    return 'Employee Directory';
  };

  const getPageDescription = (): string => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'BranchAdmin') {
      return `Manage employees in ${getCurrentUserBranchName()} branch`;
    }
    return 'Manage your employee database efficiently';
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
        <div className="max-w-auto mx-auto">
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:translate-y-1"
              >
                <FiPlus className="mr-2" />
                Add new Employee
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
                    placeholder="Search employees by name, username, email, or status..."
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
                        setFilteredEmployees(employees);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  )}
                  {isDropdownOpen && filteredEmployees.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredEmployees.map((employee) => (
                        <motion.div
                          key={employee.empId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          onClick={() => {
                            setSearchTerm(`${employee.name} (${employee.username})`);
                            setFilteredEmployees([employee]);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.username}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {employee.status} • {branches.find(b => b.branchId === employee.branchId)?.name || 'N/A'}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <select
                    value={filterStatus}
                    onChange={handleFilterStatus}
                    className="appearance-none block w-full pl-3 pr-10 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 text-gray-700 bg-white cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
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
                  <h3 className="text-lg font-medium text-gray-800">Loading employee data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </motion.div>
          ) : filteredEmployees.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100"
            >
              <FiUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No employees found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm ? 'Try adjusting your search query' : `Your employee list is currently empty${isBranchAdmin() ? ` for ${getCurrentUserBranchName()} branch` : ''}`}
              </p>
              {!isCustomer() && (
                <motion.button
                  whileHover={{ scale: 1.01, translateY: -4 }}
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl mx-auto"
                >
                  <FiPlus className="mr-2" />
                  Add New Employee
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
                        Employee
                        {sortConfig.key === 'name' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        Email
                        {sortConfig.key === 'email' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('branchId')}
                      >
                        Branch
                        {sortConfig.key === 'branchId' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('contactNo')}
                      >
                        Contact
                        {sortConfig.key === 'contactNo' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('dob')}
                      >
                        DOB
                        {sortConfig.key === 'dob' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortConfig.key === 'status' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee, index) => (
                      <motion.tr
                        key={employee.empId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branches.find(b => b.branchId === employee.branchId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.contactNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(employee.dob).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(employee)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(employee.empId)}
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

export default EmployeeList;