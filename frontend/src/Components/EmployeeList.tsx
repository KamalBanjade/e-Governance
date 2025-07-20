import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiSearch, FiFilter, FiList, FiGrid, FiChevronDown, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';

interface Branch {
  branchId: number;
  name: string;
}

interface EmployeeType {
  employeeTypeId: number;
  name: string;
}

interface Employee {
  empId: number;
  username: string;
  email: string;
  name: string;
  address: string;
  dob: string;
  userTypeId: number;
  employeeTypeId: number;
  branchId: number;
  contactNo: string;
  status: string;
}

interface ApiEmployee extends Omit<Employee, 'employeeTypeId'> {
  employeeType: string | EmployeeType;
}

// Constants
const EDIT_DATA_KEY = 'editEmployeeData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const isCustomer = (): boolean => {
  const role = localStorage.getItem('userRole');
  return role === 'Customer';
};

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApiEmployee | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = getAuthToken();

  const saveEditSession = (employee: ApiEmployee) => {
    const sessionId = uuidv4();
    let employeeTypeId: number;

    if (typeof employee.employeeType === 'object' && employee.employeeType && 'employeeTypeId' in employee.employeeType) {
      employeeTypeId = employee.employeeType.employeeTypeId;
    } else if (typeof employee.employeeType === 'string') {
      const foundType = employeeTypes.find((type) => type.name === employee.employeeType);
      employeeTypeId = foundType ? foundType.employeeTypeId : 0;
    } else if ('employeeTypeId' in employee) {
      employeeTypeId = (employee as any).employeeTypeId;
    } else {
      employeeTypeId = 0;
    }

    const editData = {
      empId: employee.empId,
      username: employee.username,
      email: employee.email,
      name: employee.name,
      address: employee.address,
      dob: employee.dob,
      userTypeId: employee.userTypeId,
      employeeTypeId,
      branchId: employee.branchId,
      contactNo: employee.contactNo,
      status: employee.status,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  const fetchData = async () => {
    try {
      if (!token) {
        toast.error('Authentication Required: You need to login to access this page.', {
          position: 'top-right',
          autoClose: 2000,
          onClose: () => navigate('/login'),
        });
        return;
      }

      const [employeeRes, branchRes, employeeTypeRes] = await Promise.all([
        fetch('http://localhost:5008/api/employeedetails', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5008/api/employeedetails/branches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5008/api/employeedetails/employee-types', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!employeeRes.ok || !branchRes.ok || !employeeTypeRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [employeeData, branchData, employeeTypeData] = await Promise.all([
        employeeRes.json(),
        branchRes.json(),
        employeeTypeRes.json(),
      ]);

      setEmployees(employeeData);
      setFilteredEmployees(employeeData);
      setBranches(branchData);
      setEmployeeTypes(employeeTypeData);
    } catch (error) {
      toast.error('Failed to load employee data. Please try again later.', {
        position: 'top-right',
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
  const handleSort = (key: keyof ApiEmployee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredEmployees].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredEmployees(sorted);
  };

  const handleFilterType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setFilterType(type);
    const filtered = type
      ? employees.filter((employee) => getEmployeeTypeName(employee).toLowerCase() === type.toLowerCase())
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
          toast.success('Employee deleted successfully!', { position: 'top-right', autoClose: 2000 });
        } catch (error) {
          toast.error('Failed to delete employee. Please try again.', { position: 'top-right', autoClose: 2000 });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleEdit = (employee: ApiEmployee) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(employee);
    navigate('/employees/create?edit=true');
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/employees/create?new=true');
  };

  const getEmployeeTypeName = (employee: ApiEmployee): string => {
    if (typeof employee.employeeType === 'object' && employee.employeeType && 'name' in employee.employeeType) {
      return employee.employeeType.name;
    }
    if (typeof employee.employeeType === 'string') {
      return employee.employeeType;
    }
    if ('employeeTypeId' in employee) {
      const foundType = employeeTypes.find((type) => type.employeeTypeId === (employee as any).employeeTypeId);
      if (foundType) return foundType.name;
    }
    return 'Unknown';
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <span className="bg-blue-100 p-3 rounded-full mr-4 shadow-sm">
                  <FiUsers className="text-blue-600 text-2xl" />
                </span>
                Employee Directory
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your organization's workforce efficiently
              </p>
            </div>

            {!isCustomer() && (
              <button
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all 
              duration-300 flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
              >
                <FiPlus className="mr-2" />
                Add New Employee
              </button>
            )}
          </div>

          {/* Search and Filter Card */}
          {/* Search and Filter Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 transition-all duration-300 hover:shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Enhanced Search Input with Dropdown */}
              <div className="col-span-2 relative" ref={dropdownRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search employees by name, email, or role..."
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 
                focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300
                hover:border-indigo-300 placeholder-gray-400 text-gray-700"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
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

                  {/* Search Dropdown */}
                  {isDropdownOpen && filteredEmployees.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredEmployees.map((employee) => (
                        <div
                          key={employee.empId}
                          onClick={() => {
                            setSearchTerm(`${employee.name} (${employee.email})`);
                            setFilteredEmployees([employee]);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getEmployeeTypeName(employee)} • {branches.find(b => b.branchId === employee.branchId)?.name || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Department Filter */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <select
                    value={filterType}
                    onChange={handleFilterType}
                    className="appearance-none block w-full pl-3 pr-10 py-3 border border-gray-200 rounded-lg shadow-sm
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300
          hover:border-indigo-300 text-gray-700 bg-white cursor-pointer"
                  >
                    <option value="">All Departments</option>
                    {employeeTypes.map((type) => (
                      <option key={type.employeeTypeId} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <FiChevronDown className="h-5 w-5" />
                  </div>
                </div>

                <button
                  className="p-3 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all
        hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <FiFilter className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Advanced Filters (optional) */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Add your advanced filter components here */}
                </div>
              </div>
            )}
          </div>
          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <FiList className="inline mr-2" /> Table View
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <FiGrid className="inline mr-2" /> Card View
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-12 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-800">Loading employee data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No employees found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm ? 'Try adjusting your search query' : 'Your employee list is currently empty'}
              </p>
              {!isCustomer() && (
                <button
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all hover:shadow-md"
                >
                  <FiPlus className="inline mr-2" />
                  Add New Employee
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.empId}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className="h-14 w-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl shadow-inner">
                          {employee.name.charAt(0)}
                        </div>
                        {employee.status === 'Active' && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                          }`}>
                          {employee.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="flex items-center md:col-span-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 break-words">
                          {getEmployeeTypeName(employee)}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {branches.find(b => b.branchId === employee.branchId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{employee.contactNo}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {new Date(employee.dob).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {!isCustomer() && (
                      <div className="mt-6 flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors hover:shadow"
                          aria-label={`Edit ${employee.name}`}
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.empId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors hover:shadow"
                          aria-label={`Delete ${employee.name}`}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
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
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.empId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEmployeeTypeName(employee) === 'Receptionist' ? 'bg-blue-100 text-blue-800' :
                            getEmployeeTypeName(employee) === 'Technician' ? 'bg-blue-100 text-purple-800' :
                              getEmployeeTypeName(employee) === 'Cleaner' ? 'bg-green-100 text-green-800' :
                                getEmployeeTypeName(employee) === 'Manager' ? 'bg-yellow-100 text-yellow-800' :
                                  getEmployeeTypeName(employee) === 'Security' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {getEmployeeTypeName(employee)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branches.find(b => b.branchId === employee.branchId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{employee.contactNo}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(employee.dob).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                            }`}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Showing <span className="font-medium">{filteredEmployees.length}</span> of{' '}
                  <span className="font-medium">{employees.length}</span> employees
                </div>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                    Previous
                  </button>
                  <button className="px-4 py-2 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default EmployeeList;