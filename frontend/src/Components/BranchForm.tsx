import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiMapPin, FiPhone, FiUser, FiList, FiSend, FiMap } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Branch } from '../types/models';
// import { isAdmin } from '../utility/auth';

const BranchForm = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showList, setShowList] = useState(false);
  const [formData, setFormData] = useState<Branch>({
    branchId: 0,
    name: '',
    location: '',
    contactDetails: '',
    inchargeName: '',
    status: 'Active',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!isAdmin()) {
//       toast.error('Unauthorized access. Redirecting to login.');
//       navigate('/unauthorized');
//     }
//   }, [navigate]);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5008/api/Branch', { credentials: 'include' });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setBranches(data);
    } catch (err) {
      toast.error('Failed to fetch branches. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, location, contactDetails, inchargeName } = formData;
    return name && location && contactDetails && inchargeName;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `http://localhost:5008/api/Branch/${formData.branchId}`
        : 'http://localhost:5008/api/Branch';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to save branch');
      }

      await fetchBranches();
      resetForm();
      toast.success(isEditing ? 'Branch updated successfully!' : 'Branch added successfully!');
    } catch (err) {
      toast.error('Failed to save branch. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setFormData(branch);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5008/api/Branch/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      await fetchBranches();
      toast.success('Branch deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete branch. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      branchId: 0,
      name: '',
      location: '',
      contactDetails: '',
      inchargeName: '',
      status: 'Active',
    });
    setIsEditing(false);
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Branch' : 'Add New Branch'}
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {[
            { label: 'Branch Name', name: 'name', type: 'text', icon: <FiMap className="h-5 w-5 text-gray-700" />, required: true },
            { label: 'Location', name: 'location', type: 'text', icon: <FiMapPin className="h-5 w-5 text-gray- seventy" />, required: true },
            { label: 'Contact Details', name: 'contactDetails', type: 'text', icon: <FiPhone className="h-5 w-5 text-gray-700" />, required: true },
            { label: 'Incharge Name', name: 'inchargeName', type: 'text', icon: <FiUser className="h-5 w-5 text-gray-700" />, required: true },
            { label: 'Status', name: 'status', type: 'select', icon: <FiList className="h-5 w-5 text-gray-700" />, options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ] },
          ].map(({ label, name, type, icon, options, required }) => (
            <div key={name} className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={formData[name as keyof Branch]}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                >
                  {options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  name={name}
                  value={formData[name as keyof Branch]}
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
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center ${
                loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Processing...' : isEditing ? 'Update Branch' : 'Add Branch'}
            </button>
            {isEditing && (
              <button
                onClick={resetForm}
                className="px-8 py-3 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
{/* Branch List Toggle */}
        <div className="flex justify-between items-center mt-10 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Branch List</h3>
          <button
            onClick={() => setShowList(prev => !prev)}
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            {showList ? 'Hide Branch List' : 'View Branch List'}
          </button>
        </div>

        {/* Branch List Table */}
        {showList && (
          loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : branches.length === 0 ? (
            <div className="text-center text-gray-600">No branches found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Incharge</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(branch => (
                    <tr key={branch.branchId} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{branch.name}</td>
                      <td className="px-4 py-3">{branch.location}</td>
                      <td className="px-4 py-3">{branch.contactDetails}</td>
                      <td className="px-4 py-3">{branch.inchargeName}</td>
                      <td className="px-4 py-3">{branch.status}</td>
                      <td className="px-4 py-3 flex space-x-2">
                        <button
                          onClick={() => handleEdit(branch)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(branch.branchId)}
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

export default BranchForm;