import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiSearch, FiFilter, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import type { Customer, Branch, DemandType } from '../types/models';

interface ApiCustomer extends Omit<Customer, 'demandType'> {
  demandType: string | DemandType;
  registrationMonth: string;
  registrationYear: number;
}

const EDIT_DATA_KEY = 'editCustomerData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const isCustomer = (): boolean => {
  const role = localStorage.getItem('userRole');
  return role === 'Customer';
};

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApiCustomer | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterDemandType, setFilterDemandType] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Authentication Required: You need to login to access this page.', {
          position: 'top-right',
          autoClose: 2000,
          onClose: () => navigate('/login'),
        });
        return;
      }

      const [customerResponse, branchResponse, demandTypeResponse] = await Promise.all([
        fetch('http://localhost:5008/api/customers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5008/api/customers/branches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5008/api/customers/demandtypes', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!customerResponse.ok || !branchResponse.ok || !demandTypeResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [customerData, branchData, demandTypeData] = await Promise.all([
        customerResponse.json(),
        branchResponse.json(),
        demandTypeResponse.json(),
      ]);

      // Ensure registrationMonth and registrationYear are included and normalized
      const normalizedCustomers = customerData.map((customer: ApiCustomer) => ({
        ...customer,
        registrationMonth: customer.registrationMonth || 'Unknown',
        registrationYear: customer.registrationYear || 0,
      }));

      setCustomers(normalizedCustomers);
      setFilteredCustomers(normalizedCustomers);
      setBranches(branchData);
      setDemandTypes(demandTypeData);
    } catch (error) {
      toast.error('Failed to load customer data. Please try again later.', {
        position: 'top-right',
        autoClose: 2000,
        onClose: () => window.location.reload(),
      });
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const saveEditSession = (customer: ApiCustomer) => {
    const sessionId = uuidv4();
    const editData = {
      ...customer,
      demandType: typeof customer.demandType === 'object' ? customer.demandType.name : customer.demandType,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = customers.filter(
      (customer) =>
        customer.scNo?.toLowerCase().includes(term) ||
        customer.name?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term) ||
        getDemandTypeName(customer).toLowerCase().includes(term) ||
        customer.registrationMonth?.toLowerCase().includes(term) ||
        customer.registrationYear?.toString().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const handleSort = (key: keyof ApiCustomer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredCustomers].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (key === 'registrationMonth') {
        // Sort by Nepali month order
        const monthOrder = [
          'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
          'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
        ];
        const aIndex = monthOrder.indexOf(a[key] as string);
        const bIndex = monthOrder.indexOf(b[key] as string);
        return direction === 'asc' ? aIndex - bIndex : bIndex - aIndex;
      }
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredCustomers(sorted);
  };

  const handleFilterDemandType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setFilterDemandType(type);
    const filtered = type
      ? customers.filter((customer) => getDemandTypeName(customer).toLowerCase() === type.toLowerCase())
      : customers;
    setFilteredCustomers(filtered);
  };

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
          setFilteredCustomers(filteredCustomers.filter((customer) => customer.cusId !== cusId));
          toast.success('Customer deleted successfully!', { position: 'top-right', autoClose: 2000 });
        } catch (error) {
          toast.error('Failed to delete customer. Please try again.', { position: 'top-right', autoClose: 2000 });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleEdit = (customer: ApiCustomer) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(customer);
    navigate('/Customers/create?edit=true');
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/Customers/create?new=true');
  };

  const getDemandTypeName = (customer: ApiCustomer): string => {
    if (typeof customer.demandType === 'string') return customer.demandType;
    if (customer.demandType && typeof customer.demandType === 'object' && 'name' in customer.demandType) {
      return customer.demandType.name;
    }
    return 'Unknown';
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiUsers className="mr-3 text-indigo-600" size={28} />
              Customer Management
            </h2>
            {!isCustomer() && (
              <button
                onClick={handleAddNew}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center font-semibold hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add New Customer
              </button>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by SC No, name, address, demand type, month, or year..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              <select
                value={filterDemandType}
                onChange={handleFilterDemandType}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                <option value="">All Demand Types</option>
                {demandTypes.map((type) => (
                  <option key={type.demandTypeId} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <FiUsers className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No customers found.</p>
              {!isCustomer() && (
                <button
                  onClick={handleAddNew}
                  className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
                >
                  <FiPlus className="mr-2 h-5 w-5" />
                  Add First Customer
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort('scNo')}>
                        SC No {sortConfig.key === 'scNo' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort('name')}>
                        Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Address</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">DOB</th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('mobileNo')}
                      >
                        Mobile No {sortConfig.key === 'mobileNo' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('citizenshipNo')}
                      >
                        Citizenship No {sortConfig.key === 'citizenshipNo' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Branch</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Demand Type</th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('registrationMonth')}
                      >
                        Registration Month {sortConfig.key === 'registrationMonth' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('registrationYear')}
                      >
                        Registration Year {sortConfig.key === 'registrationYear' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer, index) => (
                      <tr
                        key={customer.cusId}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{customer.scNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.address}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.dob}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.mobileNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.citizenshipNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {branches.find((b) => b.branchId === customer.registeredBranchId)?.name || customer.registeredBranchId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {getDemandTypeName(customer)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.registrationMonth}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{customer.registrationYear}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEdit(customer)}
                              className="p-2 text-indigo-600 hover:text-indigo-800 hover-scale transition-colors duration-200"
                              title="Edit Customer"
                              aria-label={`Edit customer ${customer.cusId}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.cusId)}
                              className="p-2 text-red-600 hover:text-red-800 hover-scale transition-colors duration-200"
                              title="Delete Customer"
                              aria-label={`Delete customer ${customer.cusId}`}
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
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg">
                  Total Customers: {filteredCustomers.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerList;