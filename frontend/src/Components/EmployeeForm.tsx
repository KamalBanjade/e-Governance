import { useEffect, useState } from 'react';
import type { Branch } from '../types/models';
// import { isAdmin } from '../utility/auth';
// import { useNavigate } from 'react-router-dom';

interface EmployeeType {
  employeeTypeId: number;
  name: string;
}

const EmployeeForm = () => {
  const [employee, setEmployee] = useState({
    employeeName: '',
    contactNo: '',
    status: '',
    branchId: 0,
    employeeTypeId: 0,
    userId: '' // Added userId to the state
  });

  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // const navigate = useNavigate();

  // useEffect(() => {
  //   if (!isAdmin()) {
  //     navigate('/unauthorized');
  //   }
  // }, [navigate]);

  useEffect(() => {
    // Fetch branches
    const fetchBranches = async () => {
      try {
        const res = await fetch('http://localhost:5008/api/employeedetails/branches', {
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setBranches(data);
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };

    // Fetch employee types
    const fetchEmployeeTypes = async () => {
      try {
        const res = await fetch('http://localhost:5008/api/employeedetails/employee-types', {
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setEmployeeTypes(data);
      } catch (err) {
        console.error('Error fetching employee types:', err);
      }
    };

    fetchBranches();
    fetchEmployeeTypes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee({ 
      ...employee, 
      [name]: name === 'branchId' || name === 'employeeTypeId' ? parseInt(value) || 0 : value 
    });
  };

  const handleSubmit = async () => {
    try {
      console.log('Sending employee data:', employee);
      
      const res = await fetch('http://localhost:5008/api/employeedetails/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const result = await res.json();
      alert(result.message);
      
      // Reset form after successful submission
      setEmployee({
        employeeName: '',
        contactNo: '',
        status: '',
        branchId: 0,
        employeeTypeId: 0,
        userId: ''
      });
    } catch (err) {
      console.error('Error:', err);
      alert('Error submitting form. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg my-8">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Add New Employee</h2>
      <div className="grid gap-4">
        <div className="flex items-center space-x-3">
          <label className="w-1/3 text-gray-600 font-medium">Employee Type:</label>
          <select
            name="employeeTypeId"
            className="w-2/3 p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleChange}
            value={employee.employeeTypeId}
          >
            <option value={0}>Select Employee Type</option>
            {employeeTypes.map(type => (
              <option key={type.employeeTypeId} value={type.employeeTypeId}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="w-1/3 text-gray-600 font-medium">Branch:</label>
          <select
            name="branchId"
            className="w-2/3 p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleChange}
            value={employee.branchId}
          >
            <option value={0}>Select Branch</option>
            {branches.map(branch => (
              <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="w-1/3 text-gray-600 font-medium">Employee Name:</label>
          <input
            type="text"
            name="employeeName"
            className="w-2/3 p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleChange}
            value={employee.employeeName}
            required
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="w-1/3 text-gray-600 font-medium">Contact No:</label>
          <input
            type="text"
            name="contactNo"
            className="w-2/3 p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleChange}
            value={employee.contactNo}
            required
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="w-1/3 text-gray-600 font-medium">Status:</label>
          <select
            name="status"
            className="w-2/3 p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleChange}
            value={employee.status}
            required
          >
            <option value="">-- Select Status --</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600 transition duration-200 shadow-sm"
          >
            Create Employee
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeForm;