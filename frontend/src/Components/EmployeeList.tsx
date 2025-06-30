import { useEffect, useState } from 'react';
import type { EmployeeDetails } from '../types/models';
// import { isAdmin } from '../utility/auth';
// import { useNavigate } from 'react-router-dom';
const EmployeeList = () => {
  const [employees, setEmployees] = useState<EmployeeDetails[]>([]);
  //  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5008/api/employeedetails', {
  credentials: 'include'
})
  .then(async res => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    return res.json();
  })
  .then(setEmployees)
  .catch(err => {
    console.error("Error fetching employees:", err.message);
  });

  }, []);
// useEffect(() => {
//     if (!isAdmin()) {
//       navigate('/unauthorized');
//     }
//   }, []);
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Employee List</h2>
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>ID</th><th>Type</th><th>Name</th><th>Contact</th><th>Status</th><th>Branch</th><th>UserID</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.empId}>
              <td>{emp.empId}</td><td>{emp.empType}</td><td>{emp.employeeName}</td><td>{emp.contactNo}</td>
              <td>{emp.status}</td><td>{emp.branchId}</td><td>{emp.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;