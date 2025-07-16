import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useDialog } from '../Contexts/DialogContext';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { getAuthToken } from '../utility/auth';

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

const EDIT_DATA_KEY = 'editEmployeeData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const EmployeeList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);

  const token = getAuthToken();

const saveEditSession = (employee: ApiEmployee) => {
  const sessionId = uuidv4();
  let employeeTypeId: number;

  // Try multiple ways to get employeeTypeId
  if (typeof employee.employeeType === 'object' && employee.employeeType && 'employeeTypeId' in employee.employeeType) {
    employeeTypeId = employee.employeeType.employeeTypeId;
  } else if (typeof employee.employeeType === 'string') {
    const foundType = employeeTypes.find(type => type.name === employee.employeeType);
    employeeTypeId = foundType ? foundType.employeeTypeId : 0;
  } else if ('employeeTypeId' in employee) {
    // Sometimes the API might return employeeTypeId directly
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
    employeeTypeId: employeeTypeId,
    branchId: employee.branchId,
    contactNo: employee.contactNo,
    status: employee.status,
    timestamp: Date.now(),
    sessionId: sessionId,
  };
  localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
  localStorage.setItem(EDIT_MODE_KEY, 'true');
  localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
  localStorage.setItem(EDIT_SESSION_KEY, sessionId);
};

  useEffect(() => {
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
          fetch('http://localhost:5008/api/employeedetails', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5008/api/employeedetails/branches', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5008/api/employeedetails/employee-types', {
            headers: { Authorization: `Bearer ${token}` },
          }),
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

    fetchData();
  }, [navigate, token]);

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
          toast.success('Employee deleted successfully!', {
            position: 'top-right',
            autoClose: 2000,
          });
        } catch (error) {
          toast.error('Failed to delete employee. Please try again.', {
            position: 'top-right',
            autoClose: 2000,
          });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete' }
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

  const getEmployeeTypeName = (employee: ApiEmployee) => {
    if (typeof employee.employeeType === 'object' && employee.employeeType && 'name' in employee.employeeType) {
      return employee.employeeType.name;
    }
    
    if (typeof employee.employeeType === 'string') {
      return employee.employeeType;
    }
    
    if ('employeeTypeId' in employee) {
      const foundType = employeeTypes.find(type => type.employeeTypeId === (employee as any).employeeTypeId);
      if (foundType) {
        return foundType.name;
      }
    }
    
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center">
            <FiUsers className="mr-3 text-gray-600" size={28} /> Employee's Details:
          </h2>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <FiUsers className="mx-auto h-20 w-20 text-gray-300 mb-4" />
            <p className="text-lg text-gray-600 font-medium">No employees found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DOB</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => (
                    <tr
                      key={employee.empId}
                      className={`border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{employee.empId}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{employee.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{employee.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{employee.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{employee.contactNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{employee.dob}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{employee.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {branches.find((b) => b.branchId === employee.branchId)?.name || employee.branchId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {getEmployeeTypeName(employee)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                            title="Edit Employee"
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.empId)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                            title="Delete Employee"
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
                Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </div>
              <div className="text-base font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg">
                Total Employees: {employees.length}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;