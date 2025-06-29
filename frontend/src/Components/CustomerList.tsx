import { useEffect, useState } from 'react';
import type { Customer } from '../types/models';
import { isAdmin, isEmployee } from '../utility/auth';
import { useNavigate } from 'react-router-dom';

const CustomerList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin() && !isEmployee()) {
      navigate('/unauthorized');
    }
  }, []);

  useEffect(() => {
  fetch('http://localhost:5008/api/customers', {
    credentials: 'include' 
  })
    .then(res => {
      if (res.status === 401) {
        navigate('/login');
        return;
      }
      return res.json();
    })
    .then(data => {
      if (data) setCustomers(data);
    })
    .catch(err => console.error('Error fetching customers:', err));
}, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Customer List</h2>
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>SC No</th><th>Name</th><th>Address</th><th>DOB</th><th>Mobile</th><th>Demand</th><th>Branch</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.scNo}>
              <td>{c.scNo}</td><td>{c.name}</td><td>{c.address}</td><td>{c.dob}</td>
              <td>{c.mobileNo}</td><td>{c.demandType}</td><td>{c.registeredBranchId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerList;