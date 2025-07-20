import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTag, FiFileText, FiList, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { DemandType } from '../types/models';
import { useDialog } from '../Contexts/DialogContext';

const DemandForm = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [formData, setFormData] = useState<DemandType>({
    demandTypeId: 0,
    name: '',
    description: '',
    status: 'Active',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken');

  const demandDescriptions: { [key: string]: string } = {
    '5A': 'Household Use',
    '15A': 'Small Business Use',
    '30A': 'Industrial Use',
  };

  useEffect(() => {
    const editData = localStorage.getItem('editDemandData');
    if (editData) {
      const parsedData: DemandType = JSON.parse(editData);
      const updatedDescription = demandDescriptions[parsedData.name] || parsedData.description;
      setFormData({
        ...parsedData,
        description: updatedDescription,
      });
      setIsEditing(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const updatedDescription = demandDescriptions[value] || formData.description;
      setFormData(prev => ({ ...prev, name: value, description: updatedDescription }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { name, description, status } = formData;
    return name.trim() !== '' && description.trim() !== '' && status !== '';
  };

  const resetForm = () => {
    setFormData({
      demandTypeId: 0,
      name: '',
      description: '',
      status: 'Active',
    });
    setIsEditing(false);
    localStorage.removeItem('editDemandData');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.', {
        position: 'top-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      isEditing ? 'Update Demand Type' : 'Add Demand Type',
      `Are you sure you want to ${isEditing ? 'update' : 'add'} the demand type "${formData.name}"?`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            toast.error('No authentication token. Please log in.', {
              position: 'top-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          const url = isEditing
            ? `http://localhost:5008/api/DemandType/${formData.demandTypeId}`
            : 'http://localhost:5008/api/DemandType';
          const method = isEditing ? 'PUT' : 'POST';

          const res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
          });

          if (res.status === 401) {
            toast.error('You are not authorized. Please log in.', {
              position: 'top-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          const contentType = res.headers.get('content-type');
          const result = contentType?.includes('application/json')
            ? await res.json()
            : { message: await res.text() };

          if (!res.ok) {
            toast.error(result.message || 'Failed to save demand type.', {
              position: 'top-right',
              autoClose: 2000,
            });
            console.error('Error:', result);
          } else {
            toast.success(isEditing ? 'Demand type updated successfully!' : 'Demand type added successfully!', {
              position: 'top-right',
              autoClose: 2000,
            });
            resetForm();
            navigate('/demand-list');
          }
        } catch (err) {
          toast.error('Failed to save demand type. Please try again.', {
            position: 'top-right',
            autoClose: 2000,
          });
          console.error('Submit error:', err);
        } finally {
          setLoading(false);
        }
      },
      {
        type: 'success',
        confirmText: isEditing ? 'Update' : 'Add',
        cancelText: 'Cancel',
        showCancel: true,
      }
    );
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
            {
              label: 'Name',
              name: 'name',
              type: 'select',
              icon: <FiTag className="h-5 w-5 text-gray-700" />,
              required: true,
              options: [
                { value: '', label: 'Select Demand Type' },
                { value: '5A', label: '5A' },
                { value: '15A', label: '15A' },
                { value: '30A', label: '30A' },
              ],
            },
            {
              label: 'Description',
              name: 'description',
              type: 'text',
              icon: <FiFileText className="h-5 w-5 text-gray-700" />,
              required: true,
              placeholder: 'e.g., Household Use',
            },
            {
              label: 'Status',
              name: 'status',
              type: 'select',
              icon: <FiList className="h-5 w-5 text-gray-700" />,
              options: [
                { value: '', label: 'Select the Value' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ],
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
                  required={required}
                >
                  {options?.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                      {opt.label}
                    </option>
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
      </div>
    </>
  );
};

export default DemandForm;