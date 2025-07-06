import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMapPin, FiCalendar, FiPhone, FiFileText, FiList, FiMap, FiUpload, FiSend } from 'react-icons/fi';
import { toast,ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Customer, Branch, DemandType } from '../types/models';
// import { isAdmin, isEmployee, isCustomer } from '../utility/auth';

type CustomerFormData = Omit<Customer, 'cusId'>;

const CustomerForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);

  const [customer, setCustomer] = useState<CustomerFormData>({
    scNo: '', name: '', address: '', dob: '', mobileNo: '', citizenshipNo: '',
    demandType: '', registeredBranchId: 0, citizenshipFile: null, houseFile: null
  });

  const token = localStorage.getItem('authToken');

 useEffect(() => {
  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const [branchRes, demandRes] = await Promise.all([
        fetch('http://localhost:5008/api/Customers/branches', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5008/api/Customers/demandtypes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (branchRes.status === 401 || demandRes.status === 401) {
        toast.error('Session expired. Please log in again.');
        return navigate('/login');
      }

      const branchesData = await branchRes.json();
      const demandTypesData = await demandRes.json();

      setBranches(branchesData);
      setDemandTypes(demandTypesData);
    } catch (error) {
      toast.error('Failed to load dropdown data. Please try again.');
      console.error('Error fetching dropdown data:', error);
    }
  };

  fetchDropdownData();
}, [navigate]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({
      ...prev,
      [name]: name === 'registeredBranchId' ? parseInt(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setCustomer(prev => ({ ...prev, [e.target.name]: file }));
    }
  };

  const validateForm = () => {
    const { scNo, name, mobileNo, demandType, registeredBranchId } = customer;
    return scNo && name && mobileNo && demandType && registeredBranchId;
  };

  const resetForm = () => {
    setCustomer({
      scNo: '', name: '', address: '', dob: '', mobileNo: '', citizenshipNo: '',
      demandType: '', registeredBranchId: 0, citizenshipFile: null, houseFile: null
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

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

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5008/api/Customers/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (res.status === 401) {
        toast.error('You are not authorized. Please log in.');
        return navigate('/login');
      }

      const contentType = res.headers.get("content-type");
      const result = contentType?.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        toast.error(result.message || 'Something went wrong.');
        console.error("Error:", result);
      } else {
        toast.success(result.message || 'Customer registered successfully!');
        resetForm();
      }
    } catch (error) {
      toast.error('Failed to submit the form. Please try again.');
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-5xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-500 text-center mb-8 flex items-center justify-center">
          <FiUser className="mr-2 h-8 w-8" /> Register New Customer
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Text Inputs */}
          {[
            { label: "SC No", name: "scNo", type: "text", icon: <FiFileText className="h-5 w-5 text-gray-700" /> },
            { label: "Name", name: "name", type: "text", icon: <FiUser className="h-5 w-5 text-gray-700" /> },
            { label: "Address", name: "address", type: "text", icon: <FiMapPin className="h-5 w-5 text-gray-700" /> },
            { label: "Date of Birth", name: "dob", type: "date", icon: <FiCalendar className="h-5 w-5 text-gray-700" /> },
            { label: "Mobile No", name: "mobileNo", type: "text", icon: <FiPhone className="h-5 w-5 text-gray-700" /> },
            { label: "Citizenship No", name: "citizenshipNo", type: "text", icon: <FiFileText className="h-5 w-5 text-gray-700" /> },
          ].map(({ label, name, type, icon }) => (
            <div key={name} className="flex items-center space-x-4">
              <label className="w-1/3 flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}:</span>
              </label>
              <input
                type={type}
                name={name}
                value={(customer as any)[name]}
                onChange={handleChange}
                className="w-2/3 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          {/* Demand Type Dropdown */}
          <div className="flex items-center space-x-4">
            <label className="w-1/3 flex items-center text-gray-700 font-medium">
              <FiList className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Demand Type:</span>
            </label>
            <select
              name="demandType"
              value={customer.demandType}
              onChange={handleChange}
              className="w-2/3 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Demand Type</option>
              {demandTypes.map(d => (
                <option key={d.demandTypeId} value={d.demandTypeId}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Dropdown */}
          <div className="flex items-center space-x-4">
            <label className="w-1/3 flex items-center text-gray-700 font-medium">
              <FiMap className="h-5 w-5 text-gray-700" />
              <span className="ml-2">Branch:</span>
            </label>
            <select
              name="registeredBranchId"
              value={customer.registeredBranchId}
              onChange={handleChange}
              className="w-2/3 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
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
            { label: "Citizenship File", name: "citizenshipFile" },
            { label: "House File", name: "houseFile" }
          ].map(({ label, name }) => (
            <div key={name} className="flex items-center space-x-4">
              <label className="w-1/3 flex items-center text-gray-700 font-medium">
                <FiUpload className="h-5 w-5 text-gray-700" />
                <span className="ml-2">{label}:</span>
              </label>
              <input
                type="file"
                name={name}
                onChange={handleFileChange}
                className="w-2/3 p-2 rounded-lg border border-gray-300"
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="col-span-2 text-center mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center mx-auto ${
                loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-700"
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerForm;