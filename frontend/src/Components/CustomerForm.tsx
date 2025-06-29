import { useState, useEffect } from 'react';
import type { Customer, Branch, DemandType } from '../types/models';
import { isAdmin, isEmployee, isCustomer } from '../utility/auth';
import { useNavigate } from 'react-router-dom';

const CustomerForm = () => {
  const [customer, setCustomer] = useState<Customer>({
    scNo: '', name: '', address: '', dob: '', mobileNo: '', citizenshipNo: '',
    demandType: '', registeredBranchId: 0, citizenshipFile: null, houseFile: null
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin() && !isEmployee() && !isCustomer()) {
        navigate('/unauthorized');
        return;
      }

      try {
        // Fetch Branches
        const branchRes = await fetch('http://localhost:5008/api/Customers/branches', {
          credentials: 'include'
        });
        if (branchRes.status === 401) return navigate('/login');
        const branchData = await branchRes.json();
        setBranches(branchData); // No need to reset state manually, this replaces old values

        // Fetch Demand Types
        const demandRes = await fetch('http://localhost:5008/api/Customers/demandtypes', {
          credentials: 'include'
        });
        if (demandRes.status === 401) return navigate('/login');
        const demandData = await demandRes.json();
        setDemandTypes(demandData);
      } catch (err) {
        console.error("Error fetching form data:", err);
      }
    };

    fetchData();
  }, []); // ✅ empty dependency array to run only once

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCustomer({ ...customer, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("SCNo", customer.scNo);
    formData.append("Name", customer.name);
    formData.append("Address", customer.address);
    formData.append("DOB", customer.dob);
    formData.append("MobileNo", customer.mobileNo);
    formData.append("CitizenshipNo", customer.citizenshipNo);
    formData.append("DemandTypeId", customer.demandType);
    formData.append("RegisteredBranchId", customer.registeredBranchId.toString());

    if (customer.citizenshipFile) formData.append("CitizenshipFile", customer.citizenshipFile);
    if (customer.houseFile) formData.append("HouseFile", customer.houseFile);

    try {
      const res = await fetch("http://localhost:5008/api/Customers/create", {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      if (res.status === 401) {
        alert("You are not authorized. Please log in.");
        navigate('/login');
        return;
      }

      const contentType = res.headers.get('content-type');
      const result = contentType?.includes('application/json')
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        alert(result.message || "An error occurred.");
        console.error("Error detail:", result);
      } else {
        alert(result.message || "Customer created successfully!");
      }
    } catch (err) {
      alert("Error submitting form. Please try again.");
      console.error("Submission error:", err);
    }
  };

  // ✅ Only one dropdown per branch/demandType will show now
  return (
    <div className="max-w-5xl mx-auto p-8 bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl my-10">
      <h2 className="text-3xl font-extrabold text-center text-blue-800 mb-8">Register New Customer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Fields */}
        {[
          { label: 'SC No', name: 'scNo', type: 'text' },
          { label: 'Name', name: 'name', type: 'text' },
          { label: 'Address', name: 'address', type: 'text' },
          { label: 'Date of Birth', name: 'dob', type: 'date' },
          { label: 'Mobile No', name: 'mobileNo', type: 'text' },
          { label: 'Citizenship No', name: 'citizenshipNo', type: 'text' },
        ].map(({ label, name, type }) => (
          <div key={name} className="flex items-center space-x-4">
            <label className="w-1/3 text-gray-700 font-medium">{label}:</label>
            <input
              type={type}
              name={name}
              className="w-2/3 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={handleChange}
              value={(customer as any)[name]}
            />
          </div>
        ))}

        {/* Dropdowns */}
        <div className="flex items-center space-x-4">
          <label className="w-1/3 text-gray-700 font-medium">Demand Type:</label>
          <select
            name="demandType"
            className="w-2/3 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={handleChange}
            value={customer.demandType}
          >
            <option value="">Select Demand Type</option>
            {demandTypes.map(d => (
              <option key={d.demandTypeId} value={d.demandTypeId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <label className="w-1/3 text-gray-700 font-medium">Branch:</label>
          <select
            name="registeredBranchId"
            className="w-2/3 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={handleChange}
            value={customer.registeredBranchId}
          >
            <option value="">Select Branch</option>
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Inputs */}
        {[
          { label: 'Citizenship File', name: 'citizenshipFile' },
          { label: 'House File', name: 'houseFile' },
        ].map(({ label, name }) => (
          <div key={name} className="flex items-center space-x-4">
            <label className="w-1/3 text-gray-700 font-medium">{label}:</label>
            <input
              type="file"
              name={name}
              className="w-2/3 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={handleFileChange}
            />
          </div>
        ))}

        <div className="col-span-2 text-center mt-6">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
