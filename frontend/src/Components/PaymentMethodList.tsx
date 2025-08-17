import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiFileText, FiPlus, FiSearch } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDialog } from '../Contexts/DialogContext';

interface IPaymentMethod {
  paymentMethodId: number;
  name: string;
  logoURL: string;
  status: string;
}

const PaymentMethodList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [filteredPaymentMethods, setFilteredPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof IPaymentMethod | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
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

      const res = await fetch('http://localhost:5008/api/PaymentMethod', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.', {
          position: 'bottom-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setPaymentMethods(data);
      setFilteredPaymentMethods(data);
    } catch (err) {
      toast.error('Failed to fetch payment methods. Please try again.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = paymentMethods.filter(
      pm =>
        pm.name.toLowerCase().includes(term) ||
        pm.logoURL.toLowerCase().includes(term) ||
        pm.status.toLowerCase().includes(term)
    );
    setFilteredPaymentMethods(filtered);
  };

  const handleSort = (key: keyof IPaymentMethod) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredPaymentMethods].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredPaymentMethods(sorted);
  };

  const handleEdit = (paymentMethod: IPaymentMethod) => {
    localStorage.setItem('editPaymentMethodData', JSON.stringify(paymentMethod));
    navigate('/paymentmethodform?edit=true');
  };

  const handleDelete = async (id: number) => {
    const paymentMethod = paymentMethods.find(pm => pm.paymentMethodId === id);
    if (!paymentMethod) {
      toast.error('Payment method not found.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      'Delete Payment Method',
      `Are you sure you want to delete the payment method "${paymentMethod.name}"?`,
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

          const res = await fetch(`http://localhost:5008/api/PaymentMethod/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401) {
            toast.error('You are not authorized. Please log in.', {
              position: 'bottom-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

          toast.success('Payment method deleted successfully!', {
            position: 'bottom-right',
            autoClose: 2000,
          });
          fetchPaymentMethods();
        } catch (err) {
          toast.error('Failed to delete payment method. Please try again.', {
            position: 'bottom-right',
            autoClose: 2000,
          });
          console.error('Delete error:', err);
        } finally {
          setLoading(false);
        }
      },
      {
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
      }
    );
  };

  const handleAddNew = () => {
    localStorage.removeItem('editPaymentMethodData');
    navigate('/paymentmethodform?new=true');
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-blue-600 h-8 w-8" />
              Payment Method List
            </h2>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold hover-scale"
            >
              <FiPlus className="mr-2 h-5 w-5" />
              Add New Payment Method
            </button>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search payment methods..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full bg-gray-50 text-gray-900"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading payment methods...</p>
            </div>
          ) : filteredPaymentMethods.length === 0 ? (
            <div className="text-center py-16">
              <FiFileText className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No payment methods found.</p>
              <button
                onClick={handleAddNew}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add First Payment Method
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      {[
                        { label: 'ID', key: 'paymentMethodId' },
                        { label: 'Name', key: 'name' },
                        { label: 'Logo', key: 'logoURL' },
                        { label: 'Status', key: 'status' },
                        { label: 'Actions', key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={key ? () => handleSort(key as keyof IPaymentMethod) : undefined}
                        >
                          {label}
                          {key && sortConfig.key === key && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaymentMethods.map((pm, index) => (
                      <tr
                        key={pm.paymentMethodId}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{pm.paymentMethodId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{pm.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <img
                              src={pm.logoURL}
                              alt={`${pm.name} logo`}
                              className="h-8 w-auto max-w-16 object-contain"
                              onError={(e) => {
                                // Handle image load error by showing a placeholder or fallback
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <span className="text-xs text-gray-500 hidden">
                              Image failed to load
                            </span>
                          </div>
                          {/* <div className="text-xs text-gray-400 mt-1 truncate max-w-32" title={pm.logoURL}>
                            {pm.logoURL}
                          </div> */}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pm.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {pm.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(pm)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              title="Edit Payment Method"
                              aria-label={`Edit payment method ${pm.name}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(pm.paymentMethodId)}
                              className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                              title="Delete Payment Method"
                              aria-label={`Delete payment method ${pm.name}`}
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {filteredPaymentMethods.length} payment method{filteredPaymentMethods.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Payment Methods: {paymentMethods.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentMethodList;