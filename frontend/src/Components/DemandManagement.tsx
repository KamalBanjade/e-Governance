import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiTag, FiFileText, FiList, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { DemandType } from '../types/models';

const DemandManagement = () => {
  const navigate = useNavigate();
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [formData, setFormData] = useState<DemandType>({
    demandTypeId: 0,
    name: '',
    description: '',
    status: 'Active',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchDemandTypes();
  }, []);

  const fetchDemandTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5008/api/DemandType', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        return navigate('/login');
      }

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

      const data = await res.json();
      setDemandTypes(data);
    } catch (err) {
      toast.error('Failed to fetch demand types. Please try again.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, description } = formData;
    return name.trim() !== '' && description.trim() !== '';
  };

  const resetForm = () => {
    setFormData({
      demandTypeId: 0,
      name: '',
      description: '',
      status: 'Active',
    });
    setIsEditing(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `http://localhost:5008/api/DemandType/${formData.demandTypeId}`
        : 'http://localhost:5008/api/DemandType';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
        toast.error(result.message || 'Failed to save demand type.');
        console.error('Error:', result);
      } else {
        toast.success(isEditing ? 'Demand type updated successfully!' : 'Demand type added successfully!');
        resetForm();
        fetchDemandTypes();
      }
    } catch (err) {
      toast.error('Failed to save demand type. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (demandType: DemandType) => {
    setFormData(demandType);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this demand type?')) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5008/api/DemandType/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        toast.error('You are not authorized. Please log in.');
        return navigate('/login');
      }

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

      toast.success('Demand type deleted successfully!');
      fetchDemandTypes();
    } catch (err) {
      toast.error('Failed to delete demand type. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Demand Type' : 'Add New Demand Type'}
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {[
            { label: 'Name', name: 'name', type: 'text', icon: <FiTag className="h-5 w-5 text-gray-700" />, required: true, placeholder: 'e.g., 5A' },
            { label: 'Description', name: 'description', type: 'text', icon: <FiFileText className="h-5 w-5 text-gray-700" />, required: true, placeholder: 'e.g., 5 Ampere Connection' },
            {
              label: 'Status', name: 'status', type: 'select', icon: <FiList className="h-5 w-5 text-gray-700" />, options: [
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' }
              ]
            },
          ].map(({ label, name, type, icon, options, required, placeholder }) => (
            <div key={name} className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={formData[name as keyof DemandType]}
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
                  value={formData[name as keyof DemandType]}
                  onChange={handleChange}
                  placeholder={placeholder}
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
              {loading ? 'Processing...' : isEditing ? 'Update Demand Type' : 'Add Demand Type'}
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

        <div className="flex justify-between items-center mt-10 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Demand Type List</h3>
          <button
            onClick={() => setShowList(prev => !prev)}
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            {showList ? 'Hide Demand Type List' : 'View Demand Type List'}
          </button>
        </div>

        {showList && (
          loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : demandTypes.length === 0 ? (
            <div className="text-center text-gray-600">No demand types found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandTypes.map(demandType => (
                    <tr key={demandType.demandTypeId} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{demandType.demandTypeId}</td>
                      <td className="px-4 py-3">{demandType.name}</td>
                      <td className="px-4 py-3">{demandType.description}</td>
                      <td className="px-4 py-3">{demandType.status}</td>
                      <td className="px-4 py-3 flex space-x-2">
                        <button
                          onClick={() => handleEdit(demandType)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(demandType.demandTypeId)}
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

export default DemandManagement;
