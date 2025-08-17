// BranchAdminList.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiSearch, FiFilter, FiList, FiGrid, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import { useClickOutside, useEscapeKey } from '../utility/useCustomHooks';

interface Branch {
  branchId: number;
  name: string;
}

interface BranchAdmin {
  adminId: number;
  username: string;
  email: string;
  name: string;
  address: string;
  dob: string;
  userTypeId: number;
  branchId: number;
  contactNo: string;
  status: string;
}

// Constants
const EDIT_DATA_KEY = 'editBranchAdminData';
const EDIT_MODE_KEY = 'isEditBranchAdminOperation';
const EDIT_TIMESTAMP_KEY = 'editBranchAdminTimestamp';
const EDIT_SESSION_KEY = 'editBranchAdminSessionId';

const getUserRole = (): string | null => {
  return localStorage.getItem('userRole');
};

const BranchAdminList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [admins, setAdmins] = useState<BranchAdmin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<BranchAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof BranchAdmin | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = getAuthToken();
  const userRole = getUserRole();

  const saveEditSession = (admin: BranchAdmin) => {
    const sessionId = uuidv4();

    const editData = {
      adminId: admin.adminId,
      username: admin.username,
      email: admin.email,
      name: admin.name,
      address: admin.address,
      dob: admin.dob,
      userTypeId: admin.userTypeId,
      branchId: admin.branchId,
      contactNo: admin.contactNo,
      status: admin.status,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  const fetchData = async () => {
    try {
      if (!token) {
        toast.error('Authentication Required: You need to login to access this page.', {
          position: 'bottom-right',
          autoClose: 2000,
          onClose: () => navigate('/login'),
        });
        return;
      }

      const [adminRes, branchRes] = await Promise.all([
        fetch('http://localhost:5008/api/branchadmins', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5008/api/branchadmins/branches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!adminRes.ok || !branchRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [adminData, branchData] = await Promise.all([
        adminRes.json(),
        branchRes.json(),
      ]);

      setAdmins(adminData);
      setFilteredAdmins(adminData);
      setBranches(branchData);
    } catch (error) {
      toast.error('Failed to load branch admin data. Please try again later.', {
        position: 'bottom-right',
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
  }, [navigate, token]);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useEscapeKey(() => setIsDropdownOpen(false));

  const handleSort = (key: keyof BranchAdmin) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredAdmins].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredAdmins(sorted);
  };

  const handleDelete = (adminId: number) => {
    confirm(
      'Delete Branch Admin',
      'Are you sure you want to delete this branch admin? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`http://localhost:5008/api/branchadmins/${adminId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Failed to delete branch admin');
          setAdmins(admins.filter((admin) => admin.adminId !== adminId));
          setFilteredAdmins(filteredAdmins.filter((admin) => admin.adminId !== adminId));
          toast.success('Branch Admin deleted successfully!', { position: 'bottom-right', autoClose: 2000 });
        } catch (error) {
          toast.error('Failed to delete branch admin. Please try again.', { position: 'bottom-right', autoClose: 2000 });
          console.error('Delete error:', error);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleEdit = (admin: BranchAdmin) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(admin);
    navigate('/branch-admins/create?edit=true');
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/branch-admins/create?new=true');
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <span className="bg-blue-100 p-3 rounded-full mr-4 shadow-sm">
                  <FiUsers className="text-blue-600 text-2xl" />
                </span>
                Branch Admin Directory
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your branch administrators efficiently
              </p>
            </div>

            {userRole === 'Admin' && (
              <button
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all 
              duration-300 flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
              >
                <FiPlus className="mr-2" />
                Add New Branch Admin
              </button>
            )}
          </div>

          {/* Search and Filter Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 transition-all duration-300 hover:shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Enhanced Search Input with Dropdown */}
              <div className="col-span-2 relative" ref={dropdownRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search branch admins by name, email..."
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 
                focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300
                hover:border-indigo-300 placeholder-gray-400 text-gray-700"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsDropdownOpen(false);
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilteredAdmins(admins);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  )}

                  {/* Search Dropdown */}
                  {isDropdownOpen && filteredAdmins.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAdmins.map((admin) => (
                        <div
                          key={admin.adminId}
                          onClick={() => {
                            setSearchTerm(`${admin.name} (${admin.email})`);
                            setFilteredAdmins([admin]);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{admin.name}</div>
                          <div className="text-sm text-gray-600">{admin.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {branches.find(b => b.branchId === admin.branchId)?.name || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Button */}
              <div className="flex gap-3 items-center">
                <button
                  className="p-3 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all
        hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <FiFilter className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Advanced Filters (optional) */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Add advanced filter components if needed */}
                </div>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <FiList className="inline mr-2" /> Table View
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <FiGrid className="inline mr-2" /> Card View
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-12 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-800">Loading branch admin data</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch the latest information</p>
                </div>
              </div>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">No branch admins found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                {searchTerm ? 'Try adjusting your search query' : 'Your branch admin list is currently empty'}
              </p>
              {userRole === 'Admin' && (
                <button
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all hover:shadow-md"
                >
                  <FiPlus className="inline mr-2" />
                  Add New Branch Admin
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.adminId}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className="h-14 w-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl shadow-inner">
                          {admin.name.charAt(0)}
                        </div>
                        {admin.status === 'Active' && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{admin.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                          }`}>
                          {admin.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {branches.find(b => b.branchId === admin.branchId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{admin.contactNo}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {new Date(admin.dob).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {userRole === 'Admin' && (
                      <div className="mt-6 flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(admin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors hover:shadow"
                          aria-label={`Edit ${admin.name}`}
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.adminId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors hover:shadow"
                          aria-label={`Delete ${admin.name}`}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        Admin
                        {sortConfig.key === 'name' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.adminId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                              {admin.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branches.find(b => b.branchId === admin.branchId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{admin.contactNo}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(admin.dob).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                            }`}>
                            {admin.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {userRole === 'Admin' && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(admin)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                              >
                                <FiEdit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(admin.adminId)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Showing <span className="font-medium">{filteredAdmins.length}</span> of{' '}
                  <span className="font-medium">{admins.length}</span> branch admins
                </div>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                    Previous
                  </button>
                  <button className="px-4 py-2 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default BranchAdminList;