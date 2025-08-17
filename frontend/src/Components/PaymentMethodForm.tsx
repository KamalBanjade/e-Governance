import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiList, FiPlus, FiSend } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDialog } from '../Contexts/DialogContext';

interface IPaymentMethod {
  paymentMethodId: number;
  name: string;
  logoURL: string;
  status: string;
}

// Predefined payment methods with logo URLs from local assets
const paymentMethodLogos: { [key: string]: { name: string; logoURL: string } } = {
  eSewa: { name: 'eSewa', logoURL: 'src/assets/images/esewa.png' },
  Khalti: { name: 'Khalti', logoURL: 'src/assets/images/khalti.png' },
  Visa: { name: 'Visa', logoURL: 'src/assets/images/visa.webp' },
  MasterCard: { name: 'MasterCard', logoURL: 'src/assets/images/mastercard.png' },
};

const PaymentMethodForm = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [formData, setFormData] = useState<IPaymentMethod>({
    paymentMethodId: 0,
    name: '',
    logoURL: '',
    status: 'Active',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const editData = localStorage.getItem('editPaymentMethodData');
    if (editData) {
      setFormData(JSON.parse(editData));
      setIsEditing(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const selectedMethod = paymentMethodLogos[value];
      setFormData(prev => ({
        ...prev,
        name: selectedMethod?.name || '',
        logoURL: selectedMethod?.logoURL || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { name, logoURL, status } = formData;
    if (!name || !logoURL || !status) {
      toast.error('Please fill in all required fields.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      paymentMethodId: 0,
      name: '',
      logoURL: '',
      status: 'Active',
    });
    setIsEditing(false);
    localStorage.removeItem('editPaymentMethodData');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    confirm(
      isEditing ? 'Update Payment Method' : 'Add Payment Method',
      `Are you sure you want to ${isEditing ? 'update' : 'add'} the payment method "${formData.name}"?`,
      async () => {
        setLoading(true);
        try {
          if (!token) {
            toast.error('No authentication token. Please log in.', {
              position: 'bottom-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          const url = isEditing
            ? `http://localhost:5008/api/PaymentMethod/${formData.paymentMethodId}`
            : 'http://localhost:5008/api/PaymentMethod';
          const method = isEditing ? 'PUT' : 'POST';

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          };

          const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(formData),
          });

          if (res.status === 401) {
            toast.error('You are not authorized. Please log in.', {
              position: 'bottom-right',
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
            const errorMessage = result.errors
              ? Object.values(result.errors).flat().join(', ')
              : result.message || 'Failed to save payment method';
            throw new Error(errorMessage);
          }

          toast.success(isEditing ? 'Payment method updated successfully!' : 'Payment method added successfully!', {
            position: 'bottom-right',
            autoClose: 2000,
          });
          resetForm();
          navigate('/paymentmethodlist');
        } catch (err: any) {
          toast.error(err.message || 'Failed to save payment method. Please try again.', {
            position: 'bottom-right',
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
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="max-w-2xl mx-auto p-8 bg-gradient-to-tr from-blue-100 to-white rounded-2xl shadow-lg mt-10">
        <h2 className="text-3xl font-bold text-blue-700 text-center mb-8 flex items-center justify-center">
          <FiPlus className="mr-2 h-8 w-8" />
          {isEditing ? 'Edit Payment Method' : 'Add New Payment Method'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              label: 'Payment Method',
              name: 'name',
              type: 'select',
              icon: <FiList className="h-5 w-5 text-gray-700" />,
              required: true,
              options: [
                { value: '', label: 'Select Payment Method' },
                { value: 'eSewa', label: 'eSewa' },
                { value: 'Khalti', label: 'Khalti' },
                { value: 'Visa', label: 'Visa' },
                { value: 'MasterCard', label: 'MasterCard' },
              ],
            },
            {
              label: 'Status',
              name: 'status',
              type: 'select',
              icon: <FiList className="h-5 w-5 text-gray-700" />,
              required: true,
              options: [
                { value: '', label: 'Select the Value' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ],
            },
          ].map(({ label, name, icon, options, required }) => (
            <div key={name} className="flex flex-col space-y-2">
              <label className="flex items-center text-gray-700 font-medium">
                {icon}
                <span className="ml-2">{label}{required ? ' *' : ''}:</span>
              </label>
              <select
                name={name}
                value={formData[name as keyof IPaymentMethod]}
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
              {name === 'name' && formData.logoURL && (
                <div className="mt-4">
                  <img
                    src={formData.logoURL}
                    alt={`${formData.name} logo`}
                    className="h-12 w-auto"
                    onError={() => console.error('Logo failed to load')}
                  />
                </div>
              )}
            </div>
          ))}

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
      </div>
    </>
  );
};

export default PaymentMethodForm;