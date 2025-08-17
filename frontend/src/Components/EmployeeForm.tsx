import { useEffect, useState, useRef } from 'react';
import { FiUser, FiSend, FiArrowLeft, FiEdit } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDialog } from '../Contexts/DialogContext';
import { v4 as uuidv4 } from 'uuid';
import { getAuthToken } from '../utility/auth';
import { formatDateForInput, formatDateForApi } from '../utility/dateFormatter';

interface Branch {
  branchId: number;
  name: string;
}

interface Employee {
  empId?: number;
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

type EmployeeFormData = Omit<Employee, 'empId'> & { empId?: number };

const EDIT_DATA_KEY = 'editEmployeeData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const EmployeeForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const defaultFormState: EmployeeFormData = {
    username: '',
    email: '',
    name: '',
    address: '',
    dob: '',
    userTypeId: 2,
    employeeTypeId: 1, // Set to Meter Reader (assuming ID 1 corresponds to Meter Reader)
    branchId: 0,
    contactNo: '',
    status: '',
  };

  const [employee, setEmployee] = useState<EmployeeFormData>(defaultFormState);

  const token = getAuthToken();

  const cleanupEditData = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
  };

  const isEditSessionValid = () => {
    const editData = localStorage.getItem(EDIT_DATA_KEY);
    const isEdit = localStorage.getItem(EDIT_MODE_KEY) === 'true';
    const timestamp = localStorage.getItem(EDIT_TIMESTAMP_KEY);
    const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

    if (!editData || !isEdit || !timestamp || !sessionId) {
      return false;
    }

    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return sessionAge < maxAge;
  };

  const determineFormMode = () => {
    const urlParams = new URLSearchParams(location.search);
    const isNewEmployee = urlParams.get('new') === 'true';

    if (isNewEmployee) {
      cleanupEditData();
      return 'create';
    }

    if (isEditSessionValid()) {
      return 'edit';
    }

    cleanupEditData();
    return 'create';
  };

  useEffect(() => {
    const mode = determineFormMode();

    if (mode === 'create') {
      setEmployee(defaultFormState);
      setEditMode(false);
      setEditSessionId(null);
      cleanupEditData();
    } else if (mode === 'edit') {
      const editData = localStorage.getItem(EDIT_DATA_KEY);
      const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

      if (editData && sessionId) {
        try {
          const parsed = JSON.parse(editData);
          setEditMode(true);
          setEditSessionId(sessionId);

          const branchId = parsed.branchId ? Number(parsed.branchId) : 0;

          setEmployee({
            empId: parsed.empId,
            username: parsed.username || '',
            email: parsed.email || '',
            name: parsed.name || '',
            address: parsed.address || '',
            dob: formatDateForInput(parsed.dob),
            userTypeId: parsed.userTypeId || 2,
            employeeTypeId: 1, // Set to Meter Reader
            branchId: branchId,
            contactNo: parsed.contactNo || '',
            status: parsed.status || '',
          });
        } catch (error) {
          console.error('Error parsing edit data:', error);
          cleanupEditData();
          setEditMode(false);
          setEmployee(defaultFormState);
        }
      }
    }

    isInitialMount.current = false;
  }, [location.search]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      if (!token) {
        confirm(
          'Authentication Required',
          'You need to login to access this page.',
          () => navigate('/login'),
          { type: 'danger', confirmText: 'Login' }
        );
        return;
      }

      try {
        const branchRes = await fetch('http://localhost:5008/api/employeedetails/branches', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!branchRes.ok) {
          throw new Error('Dropdown fetch failed');
        }

        const branchesData = await branchRes.json();
        setBranches(branchesData);
      } catch (error) {
        console.error('Error fetching dropdowns:', error);
        confirm(
          'Fetch Failed',
          'Could not load dropdown data. Please try again.',
          () => window.location.reload(),
          { type: 'danger' }
        );
      }
    };

    fetchDropdowns();
  }, [navigate, confirm, token]);


  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editMode) {
        localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editMode]);

  useEffect(() => {
    if (editMode && !isInitialMount.current) {
      const editData = {
        empId: employee.empId,
        username: employee.username,
        email: employee.email,
        name: employee.name,
        address: employee.address,
        dob: formatDateForApi(employee.dob),
        userTypeId: employee.userTypeId,
        employeeTypeId: employee.employeeTypeId,
        branchId: employee.branchId,
        contactNo: employee.contactNo,
        status: employee.status,
        timestamp: Date.now(),
        sessionId: editSessionId || uuidv4(),
      };

      localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
      localStorage.setItem(EDIT_MODE_KEY, 'true');
      localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
      localStorage.setItem(EDIT_SESSION_KEY, editData.sessionId);
    }
  }, [employee, editMode, editSessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee(prev => ({
      ...prev,
      [name]: name === 'branchId' || name === 'employeeTypeId' || name === 'userTypeId' ? parseInt(value) || 0 : value,
    }));
  };

  const validateForm = () => {
    const { username, email, name, address, dob, employeeTypeId, branchId, contactNo, status } = employee;
    return (
      username.trim() &&
      email.trim() &&
      name.trim() &&
      address.trim() &&
      dob.match(/^\d{4}-\d{2}-\d{2}$/) &&
      employeeTypeId > 0 &&
      branchId > 0 &&
      contactNo.trim() &&
      status
    );
  };

  const resetForm = () => {
    setEmployee(defaultFormState);
    setEditMode(false);
    setEditSessionId(null);
    cleanupEditData();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      confirm(
        'Validation Error',
        'Please fill in all required fields correctly.',
        () => { },
        { type: 'warning', showCancel: false }
      );
      return;
    }

    confirm(
      editMode ? 'Update Employee' : 'Create Employee',
      editMode
        ? `Are you sure you want to update ${employee.name}?`
        : `Are you sure you want to create ${employee.name}?`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            confirm(
              'Authentication Required',
              'You need to login to perform this action',
              () => navigate('/login'),
              { type: 'danger', confirmText: 'Login' }
            );
            return;
          }
          const dataToSend = {
            empId: employee.empId,
            username: employee.username,
            email: employee.email,
            name: employee.name,
            address: employee.address,
            dob: employee.dob, // This should be in ISO format (YYYY-MM-DD)
            userTypeId: employee.userTypeId || 2,
            employeeTypeId: employee.employeeTypeId,
            branchId: employee.branchId,
            contactNo: employee.contactNo,
            status: employee.status,
          };
          const url = editMode
            ? `http://localhost:5008/api/employeedetails/${employee.empId}`
            : 'http://localhost:5008/api/employeedetails';
          const method = editMode ? 'PUT' : 'POST';

          const response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit employee');
          }

          toast.success(editMode ? 'Employee updated successfully!' : 'Employee created successfully!', {
            position: 'bottom-right',
            autoClose: 3000,
            onClose: () => {
              resetForm();
              if (editMode) {
                navigate('/employeeList');
              }
            },
          });
        } catch (error: any) {
          confirm(
            'Error',
            error.message || 'Failed to submit the form. Please try again.',
            () => { },
            { type: 'danger' }
          );
        } finally {
          setLoading(false);
        }
      },
      {
        type: editMode ? 'warning' : 'info',
        confirmText: editMode ? 'Update' : 'Create',
      }
    );
  };

  const handleCancel = () => {
    confirm(
      'Cancel',
      'Are you sure you want to cancel? Any unsaved changes will be lost.',
      () => {
        resetForm();
        navigate('/employeeList');
      },
      { type: 'warning', confirmText: 'Yes, Cancel' }
    );
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="flex items-center justify-center bg-gradient-to-tr from-blue-to-white px-4 py-10">
        <div className="max-w-2xl w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
              {editMode ? <FiEdit className="w-6 h-6" /> : <FiUser className="w-6 h-6" />}
            </div>
            <h2 className="text-3xl font-semibold text-gray-800">
              {editMode ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">Employee Information</p>
          </div>

          {editMode && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Editing Employee
              </h4>
              <p className="text-sm text-blue-700">
                You are editing: <strong>{employee.name}</strong> (Username: {employee.username})
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Username *"
                  name="username"
                  value={employee.username}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Username"
                />
                <InputField
                  label="Email *"
                  name="email"
                  type="email"
                  value={employee.email}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Email"
                />
                <InputField
                  label="Full Name *"
                  name="name"
                  value={employee.name}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Full Name"
                />
                <InputField
                  label="Address *"
                  name="address"
                  value={employee.address}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Address"
                />
                <InputField
                  label="Date of Birth *"
                  name="dob"
                  type="date"
                  value={employee.dob}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Select Date of Birth"
                />
                <InputField
                  label="Contact No *"
                  name="contactNo"
                  value={employee.contactNo}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Contact Number"
                />
              </div>
            </div>

             <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Branch *"
                  name="branchId"
                  value={employee.branchId}
                  onChange={handleChange}
                  options={branches.map(b => ({ id: b.branchId, name: b.name }))}
                  placeholder="Select Branch"
                />

                <SelectField
                  label="Status *"
                  name="status"
                  value={employee.status}
                  onChange={handleChange}
                  options={[
                    { id: 'Active', name: 'Active' },
                    { id: 'Inactive', name: 'Inactive' },
                  ]}
                  placeholder="Select Status"
                />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
            >
              <FiSend className="mr-2 h-5 w-5" />
              {loading ? (editMode ? 'Updating...' : 'Submitting...') : (editMode ? 'Update' : 'Create')}
            </button>
          </div>

          {editMode && (
            <div className="pt-4 text-center">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-full text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FiArrowLeft className="mr-2 h-5 w-5" />
                Back to List
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
  focusedField: string | null;
  setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
  placeholder?: string;
  helperText?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  type = 'text',
  setFocusedField,
  placeholder,
  helperText,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocusedField(name)}
        onBlur={() => setFocusedField(null)}
        className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
        placeholder={placeholder}
        autoComplete="off"
      />
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
};
interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id: string | number; name: string }>;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};


export default EmployeeForm;