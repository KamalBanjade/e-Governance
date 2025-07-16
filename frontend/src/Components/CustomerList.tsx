import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useDialog } from '../Contexts/DialogContext';
import type { Customer, Branch, DemandType } from '../types/models';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';

// Extended interface for API response
interface ApiCustomer extends Omit<Customer, 'demandType'> {
  demandType: string | DemandType;
}

// Enhanced localStorage keys
const EDIT_DATA_KEY = 'editCustomerData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const CustomerList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [, setDemandTypes] = useState<DemandType[]>([]);

  // Enhanced function to save edit session
  const saveEditSession = (customer: ApiCustomer) => {
    const sessionId = uuidv4();
    const editData = {
      ...customer,
      demandType: typeof customer.demandType === 'object'
        ? customer.demandType.name
        : customer.demandType,
      timestamp: Date.now(),
      sessionId: sessionId
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  // Fetch customers, branches, and demand types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('Authentication Required: You need to login to access this page.', {
            position: "top-right",
            autoClose: 2000,
            onClose: () => navigate('/login'),
          });
          return;
        }

        // Fetch customers
        const customerResponse = await fetch('http://localhost:5008/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!customerResponse.ok) throw new Error('Failed to fetch customers');
        const customerData = await customerResponse.json();
        setCustomers(customerData);

        // Fetch branches
        const branchResponse = await fetch('http://localhost:5008/api/customers/branches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!branchResponse.ok) throw new Error('Failed to fetch branches');
        const branchData = await branchResponse.json();
        setBranches(branchData);

        // Fetch demand types
        const demandTypeResponse = await fetch('http://localhost:5008/api/customers/demandtypes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!demandTypeResponse.ok) throw new Error('Failed to fetch demand types');
        const demandTypeData = await demandTypeResponse.json();
        setDemandTypes(demandTypeData);
      }
      catch (error) {
        toast.error('Failed to load customer data. Please try again later.', {
          position: "top-right",
          autoClose: 2000,
          onClose: () => window.location.reload(),
        });
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ navigate]);

  // Handle delete customer
  const handleDelete = (cusId: number) => {

    confirm(
      'Delete Customer',
      'Are you sure you want to delete this customer? This action cannot be undone.',
      async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`http://localhost:5008/api/customers/${cusId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Failed to delete customer');
          setCustomers(customers.filter((customer) => customer.cusId !== cusId));
          toast.success('Customer deleted successfully!', {
            position: "top-right",
            autoClose: 2000,
          });
        } catch (error) {
          toast.error('Failed to delete customer. Please try again.', {
            position: "top-right",
            autoClose: 2000,
          });
          console.error('Delete error:', error);
        }
      },
      // { type: 'danger', confirmText: 'Delete' }
    );
  };

  // Enhanced edit handler
  const handleEdit = (customer: ApiCustomer) => {
    // Save edit session with proper persistence
    saveEditSession(customer);

    // Navigate to customer form
    navigate('/Customers/create');
  };
  // Helper function to get demand type name
  const getDemandTypeName = (customer: ApiCustomer) => {
    if (typeof customer.demandType === 'string') {
      return customer.demandType;
    }
    if (customer.demandType && typeof customer.demandType === 'object' && 'name' in customer.demandType) {
      return customer.demandType.name;
    }
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center">
            <FiUsers className="mr-3 text-gray-600" size={28} /> Customer's Details:
          </h2>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <FiUsers className="mx-auto h-20 w-20 text-gray-300 mb-4" />
            <p className="text-lg text-gray-600 font-medium">No customers found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SC No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DOB</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Citizenship No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Demand Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr
                      key={customer.cusId}
                      className={`border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{customer.scNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{customer.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{customer.dob}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{customer.mobileNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{customer.citizenshipNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {branches.find((b) => b.branchId === customer.registeredBranchId)?.name ||
                          customer.registeredBranchId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {getDemandTypeName(customer)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                            title="Edit Customer"
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.cusId)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                            title="Delete Customer"
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
                Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
              </div>
              <div className="text-base font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg">
                Total Customers: {customers.length}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerList;