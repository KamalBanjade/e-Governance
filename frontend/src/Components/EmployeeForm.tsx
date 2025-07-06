import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiList, FiMap, FiSend, FiEdit, FiTrash2, FiPlus, FiMail } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Branch } from '../types/models';
import { getAuthToken } from '../utility/auth';

interface EmployeeType {
  employeeTypeId: number;
  name: string;
}

interface Employee {
  empId?: number;
  employeeName: string;
  contactNo: string;
  status: string;
  branchId: number;
  employeeTypeId: number;
  email: string;
  // Add these fields to match RegisterEmployeeViewModel
  username?: string;
  name?: string;
  address?: string;
  dob?: string;
  userTypeId?: number;
  userId?: string;
  branchName?: string;
  employeeTypeName?: string;
}

const EmployeeForm = () => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employee, setEmployee] = useState<Employee>({
    employeeName: '',
    contactNo: '',
    status: '',
    branchId: 0,
    employeeTypeId: 0,
    email: '',
    username: '',
    name: '',
    address: '',
    dob: '',
    userTypeId: 2 // Default to Clerk
  });
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      toast.error('No authentication token found. Please log in.');
      navigate('/login');
    }
  }, [token, navigate]);

  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleResponseError = async (response: Response) => {
    if (response.status === 401) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return true;
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    return false;
  };

  useEffect(() => {
    if (token) {
      fetchBranches();
      fetchEmployeeTypes();
      fetchEmployees();
    }
  }, [token]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('http://localhost:5008/api/employeedetails/branches', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (await handleResponseError(res)) return;
      setBranches(await res.json());
    } catch (err) {
      toast.error('Failed to load branches.');
      console.error(err);
    }
  };

  const fetchEmployeeTypes = async () => {
    try {
      const res = await fetch('http://localhost:5008/api/employeedetails/employee-types', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (await handleResponseError(res)) return;
      setEmployeeTypes(await res.json());
    } catch (err) {
      toast.error('Failed to load employee types.');
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5008/api/employeedetails', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (await handleResponseError(res)) return;
      const data = await res.json();
      const enhanced = data.map((emp: Employee) => ({
        ...emp,
        branchName: branches.find(b => b.branchId === emp.branchId)?.name || 'Unknown',
        employeeTypeName: employeeTypes.find(et => et.employeeTypeId === emp.employeeTypeId)?.name || 'Unknown'
      }));
      setEmployees(enhanced);
    } catch (err) {
      toast.error('Failed to load employees.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee({
      ...employee,
      [name]: name === 'branchId' || name === 'employeeTypeId' || name === 'userTypeId' ? parseInt(value) || 0 : value
    });
  };

  const validateForm = () => {
    const { employeeName, contactNo, status, branchId, employeeTypeId, email, username, name, address, dob } = employee;
    
    if (isEditing) {
      // For editing, only validate the employee details fields
      return (
        employeeName.trim() &&
        contactNo.trim() &&
        status &&
        branchId &&
        employeeTypeId &&
        email.trim()
      );
    } else {
      // For creating, validate all fields including user account fields
      return (
        employeeName.trim() &&
        contactNo.trim() &&
        status &&
        branchId &&
        employeeTypeId &&
        email.trim() &&
        username?.trim() &&
        name?.trim() &&
        address?.trim() &&
        dob?.trim()
      );
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error('No authentication token. Please log in.');
      navigate('/login');
      return;
    }
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `http://localhost:5008/api/employeedetails/${employee.empId}`
        : 'http://localhost:5008/api/userauth/create-employee';
      const method = isEditing ? 'PUT' : 'POST';

      let dataToSend;
      
      if (isEditing) {
        // For editing, send the original employee data structure
        dataToSend = {
          employeeName: employee.employeeName,
          contactNo: employee.contactNo,
          status: employee.status,
          branchId: employee.branchId,
          employeeTypeId: employee.employeeTypeId,
          email: employee.email
        };
      } else {
        // For creating, send the RegisterEmployeeViewModel structure
        dataToSend = {
          username: employee.username,
          email: employee.email,
          name: employee.name,
          address: employee.address,
          dob: employee.dob,
          userTypeId: employee.userTypeId || 2 // Default to Clerk
        };
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(dataToSend)
      });

      if (await handleResponseError(res)) return;

      const result = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : { message: await res.text() };

      toast.success(result.message || (isEditing ? 'Employee updated!' : 'Employee created!'));

      resetForm();
      await fetchEmployees();
    } catch (err) {
      toast.error('Error submitting form.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEmployee({
      empId: emp.empId,
      employeeName: emp.employeeName,
      contactNo: emp.contactNo,
      status: emp.status,
      branchId: emp.branchId,
      employeeTypeId: emp.employeeTypeId,
      email: emp.email || '',
      username: emp.username || '',
      name: emp.name || '',
      address: emp.address || '',
      dob: emp.dob || '',
      userTypeId: emp.userTypeId || 2
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5008/api/employeedetails/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (await handleResponseError(res)) return;
      toast.success('Employee deleted!');
      await fetchEmployees();
    } catch (err) {
      toast.error('Failed to delete employee.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmployee({
      employeeName: '',
      contactNo: '',
      status: '',
      branchId: 0,
      employeeTypeId: 0,
      email: '',
      username: '',
      name: '',
      address: '',
      dob: '',
      userTypeId: 2
    });
    setIsEditing(false);
  };

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-red-100 rounded-2xl shadow-lg mt-10">
        <h2 className="text-xl font-bold text-center text-red-700 mb-4">Authentication Required</h2>
        <p className="text-center text-red-700">Please log in to access this page.</p>
      </div>
    );
  }

  // Form fields configuration
  const formFields = [
    {
      label: 'Employee Type',
      name: 'employeeTypeId',
      type: 'select',
      icon: <FiList className="h-5 w-5 text-gray-700" />,
      options: employeeTypes.map(type => ({ value: type.employeeTypeId, label: type.name })),
      required: true
    },
    {
      label: 'Branch',
      name: 'branchId',
      type: 'select',
      icon: <FiMap className="h-5 w-5 text-gray-700" />,
      options: branches.map(branch => ({ value: branch.branchId, label: branch.name })),
      required: true
    },
    {
      label: 'Employee Name',
      name: 'employeeName',
      type: 'text',
      icon: <FiUser className="h-5 w-5 text-gray-700" />,
      required: true
    },
    ...(!isEditing ? [
      {
        label: 'Full Name',
        name: 'name',
        type: 'text',
        icon: <FiUser className="h-5 w-5 text-gray-700" />,
        required: true
      },
      {
        label: 'Username',
        name: 'username',
        type: 'text',
        icon: <FiUser className="h-5 w-5 text-gray-700" />,
        required: true
      },
      {
        label: 'Address',
        name: 'address',
        type: 'text',
        icon: <FiMap className="h-5 w-5 text-gray-700" />,
        required: true
      },
      {
        label: 'Date of Birth',
        name: 'dob',
        type: 'date',
        icon: <FiUser className="h-5 w-5 text-gray-700" />,
        required: true
      }
    ] : []),
    {
      label: 'Contact No',
      name: 'contactNo',
      type: 'text',
      icon: <FiPhone className="h-5 w-5 text-gray-700" />,
      required: true
    },
    {
      label: 'Email',
      name: 'email',
      type: 'email',
      icon: <FiMail className="h-5 w-5 text-gray-700" />,
      required: true
    },
    {
      label: 'Status',
      name: 'status',
      type: 'select',
      icon: <FiList className="h-5 w-5 text-gray-700" />,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ],
      required: true
    }
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Employee' : 'Add New Employee'}
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {formFields.map(({ label, name, type, icon, options, required }) => (
            <div key={name} className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={(employee as any)[name]}
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
                  value={(employee as any)[name]}
                  onChange={handleChange}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={required}
                />
              )}
            </div>
          ))}

          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold flex items-center justify-center ${
                loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Processing...' : isEditing ? 'Update Employee' : 'Create Employee'}
            </button>
            {isEditing && (
              <button
                onClick={resetForm}
                className="px-8 py-3 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-10 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Employee List</h3>
          <button
            onClick={() => setShowList(prev => !prev)}
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            {showList ? 'Hide Employee List' : 'View Employee List'}
          </button>
        </div>

        {showList && (
          loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-center text-gray-600">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.empId ?? `${emp.employeeName}-${emp.contactNo}`} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{emp.employeeName}</td>
                      <td className="px-4 py-3">{emp.contactNo}</td>
                      <td className="px-4 py-3">{emp.email}</td>
                      <td className="px-4 py-3">{emp.branchName}</td>
                      <td className="px-4 py-3">{emp.employeeTypeName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex space-x-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.empId!)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  );
};

export default EmployeeForm;