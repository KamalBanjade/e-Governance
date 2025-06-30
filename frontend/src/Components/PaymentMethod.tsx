import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTag, FiLink, FiList, FiPlus, FiEdit, FiTrash2, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import type { PaymentMethod } from '../types/models';
// import { isAdmin } from '../utility/auth';
interface PaymentMethod {
  paymentMethodId: number;
  name: string;
  logoURL: string;
  status: string;
}
const PaymentMethod = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [formData, setFormData] = useState<PaymentMethod>({
    paymentMethodId: 0,
    name: '',
    logoURL: '',
    status: '',
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
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5008/api/PaymentMethod', { credentials: 'include' });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPaymentMethods(data);
    } catch (err) {
      toast.error('Failed to fetch payment methods. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { name, logoURL, status } = formData;
    if (!name || !logoURL || !status) {
      toast.error('Please fill in all required fields.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const url = isEditing
        ? `http://localhost:5008/api/PaymentMethod/${formData.paymentMethodId}`
        : 'http://localhost:5008/api/PaymentMethod';
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
        const errorData = await response.json();
        const errorMessage = errorData.errors
          ? Object.values(errorData.errors).flat().join(', ')
          : errorData.message || 'Failed to save payment method';
        throw new Error(errorMessage);
      }

      await fetchPaymentMethods();
      resetForm();
      toast.success(isEditing ? 'Payment method updated successfully!' : 'Payment method added successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payment method. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setFormData(paymentMethod);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5008/api/PaymentMethod/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('You are not authorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      await fetchPaymentMethods();
      toast.success('Payment method deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete payment method. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      paymentMethodId: 0,
      name: '',
      logoURL: '',
      status: '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Payment Method' : 'Add New Payment Method'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              label: 'Name',
              name: 'name',
              type: 'text',
              icon: <FiTag className="h-5 w-5 text-gray-700" />,
              required: true,
              placeholder: 'e.g., Visa',
            },
            {
              label: 'Status',
              name: 'status',
              type: 'select',
              icon: <FiList className="h-5 w-5 text-gray-700" />,
              required: true,
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ],
            },
            {
              label: 'Logo URL',
              name: 'logoURL',
              type: 'text',
              icon: <FiLink className="h-5 w-5 text-gray-700" />,
              required: true,
              placeholder: 'e.g., https://example.com/logo.png',
              colSpan: 'lg:col-span-2',
            },
          ].map(({ label, name, type, icon, options, required, placeholder, colSpan }) => (
            <div key={name} className={`flex flex-col space-y-2 ${colSpan || ''}`}>
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={formData[name as keyof PaymentMethod]}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={required}
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
                  value={formData[name as keyof PaymentMethod]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
                  required={required}
                />
              )}
            </div>
          ))}

          {/* Submit Button */}
          <div className="lg:col-span-2 flex justify-center mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition duration-300 flex items-center justify-center ${
                loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSend className="h-5 w-5 mr-2" />
              {loading ? 'Processing...' : isEditing ? 'Update Payment Method' : 'Add Payment Method'}
            </button>
            {isEditing && (
              <button
                onClick={resetForm}
                className="ml-4 px-8 py-3 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment Method List</h3>
          {loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center text-gray-600">No payment methods found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PaymentMethodId</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Logo URL</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map(paymentMethod => (
                    <tr key={paymentMethod.paymentMethodId} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{paymentMethod.paymentMethodId}</td>
                      <td className="px-4 py-3">{paymentMethod.name}</td>
                      <td className="px-4 py-3">
                        <a href={paymentMethod.logoURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {paymentMethod.logoURL}
                        </a>
                      </td>
                      <td className="px-4 py-3">{paymentMethod.status}</td>
                      <td className="px-4 py-3 flex space-x-2">
                        <button
                          onClick={() => handleEdit(paymentMethod)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(paymentMethod.paymentMethodId)}
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
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentMethod;