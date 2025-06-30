import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiList, FiMap, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Branch } from '../types/models';
// import { isAdmin } from '../utility/auth';

interface EmployeeType {
  employeeTypeId: number;
  name: string;
}

const EmployeeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState({
    employeeName: '',
    contactNo: '',
    status: '',
    branchId: 0,
    employeeTypeId: 0,
    userId: ''
  });
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // useEffect(() => {
  //   if (!isAdmin()) {
  //     toast.error('Unauthorized access. Redirecting to login.');
  //     navigate('/unauthorized');
  //   }
  // }, [navigate]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('http://localhost:5008/api/employeedetails/branches', {
          credentials: 'include'
        });
        if (res.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setBranches(data);
      } catch (err) {
        toast.error('Failed to load branches. Please try again.');
        console.error('Error fetching branches:', err);
      }
    };

    const fetchEmployeeTypes = async () => {
      try {
        const res = await fetch('http://localhost:5008/api/employeedetails/employee-types', {
          credentials: 'include'
        });
        if (res.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setEmployeeTypes(data);
      } catch (err) {
        toast.error('Failed to load employee types. Please try again.');
        console.error('Error fetching employee types:', err);
      }
    };

    fetchBranches();
    fetchEmployeeTypes();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee({ 
      ...employee, 
      [name]: name === 'branchId' || name === 'employeeTypeId' ? parseInt(value) || 0 : value 
    });
  };

  const validateForm = () => {
    const { employeeName, contactNo, status, branchId, employeeTypeId } = employee;
    return employeeName && contactNo && status && branchId && employeeTypeId;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5008/api/employeedetails/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });

      if (res.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      const contentType = res.headers.get('content-type');
      const result = contentType?.includes('application/json')
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        toast.error(result.message || 'Failed to create employee.');
        console.error('Error:', result);
        return;
      }

      toast.success(result.message || 'Employee created successfully!');
      setEmployee({
        employeeName: '',
        contactNo: '',
        status: '',
        branchId: 0.,
        employeeTypeId: 0,
        userId: ''
      });
    } catch (err) {
      toast.error('Error submitting form. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiUser className="mr-2 h-8 w-8" /> Add New Employee
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {[
            { label: 'Employee Type', name: 'employeeTypeId', type: 'select', icon: <FiList className="h-5 w-5 text-gray-700" />, options: employeeTypes.map(type => ({ value: type.employeeTypeId, label: type.name })) },
            { label: 'Branch', name: 'branchId', type: 'select', icon: <FiMap className="h-5 w-5 text-gray-700" />, options: branches.map(branch => ({ value: branch.branchId, label: branch.name })) },
            { label: 'Employee Name', name: 'employeeName', type: 'text', icon: <FiUser className="h-5 w-5 text-gray-700" /> },
            { label: 'Contact No', name: 'contactNo', type: 'text', icon: <FiPhone className="h-5 w-5 text-gray-700" /> },
            { label: 'Status', name: 'status', type: 'select', icon: <FiList className="h-5 w-5 text-gray-700" />, options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ] }
          ].map(({ label, name, type, icon, options }) => (
            <div key={name} className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}:</span>
              </label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={(employee as any)[name]}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
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
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={name !== 'userId'}
                />
              )}
            </div>
          ))}
          <div className="text-center mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center mx-auto ${
                loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Submitting...' : 'Create Employee'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeForm;