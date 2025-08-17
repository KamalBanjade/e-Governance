import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiMapPin, FiPlus, FiSearch, FiFilter, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from '../Contexts/DialogContext';
import { getAuthToken } from '../utility/auth';
import type { Branch } from '../types/models';

// Constants
const EDIT_DATA_KEY = 'editBranchData';
const EDIT_MODE_KEY = 'isEditBranchOperation';
const EDIT_TIMESTAMP_KEY = 'editBranchTimestamp';
const EDIT_SESSION_KEY = 'editBranchSessionId';
const API_BASE_URL = 'http://localhost:5008/api';
const BRANCHES_ENDPOINT = `${API_BASE_URL}/Branch`;

const BranchList: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Branch | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('');
  const token = getAuthToken();

  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const handleResponseError = async (response: Response): Promise<boolean> => {
    if (response.status === 401) {
      confirm(
        'Session Expired',
        'Your session has expired. Please log in again.',
        () => navigate('/login'),
        { type: 'danger', confirmText: 'Login', showCancel: false }
      );
      return true;
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    return false;
  };

  const fetchBranches = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(BRANCHES_ENDPOINT, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (await handleResponseError(response)) return;

      const data = await response.json();
      setBranches(data);
      setFilteredBranches(data);
    } catch (err) {
      toast.error('Failed to fetch branches. Please try again.', {
        position: 'bottom-right',
        autoClose: 2000,
      });
      console.error('Fetch branches error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      confirm(
        'Authentication Required',
        'You need to login to access this page.',
        () => navigate('/login'),
        { type: 'danger', confirmText: 'Login', showCancel: false }
      );
      return;
    }
    fetchBranches();
  }, [navigate, token, confirm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = branches.filter(
      (branch) =>
        branch.name?.toLowerCase().includes(term) ||
        branch.location?.toLowerCase().includes(term) ||
        branch.inchargeName?.toLowerCase().includes(term)
    );
    setFilteredBranches(filtered);
  };

  const handleSort = (key: keyof Branch) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredBranches].sort((a, b) => {
      if (a[key] === undefined || b[key] === undefined) return 0;
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredBranches(sorted);
  };

  const handleFilterStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setFilterStatus(status);
    const filtered = status ? branches.filter((branch) => branch.status.toLowerCase() === status.toLowerCase()) : branches;
    setFilteredBranches(filtered);
  };

  const saveEditSession = (branch: Branch) => {
    const sessionId = uuidv4();
    const editData = {
      branchId: branch.branchId,
      name: branch.name,
      location: branch.location,
      contactDetails: branch.contactDetails,
      inchargeName: branch.inchargeName,
      status: branch.status,
      timestamp: Date.now(),
      sessionId,
    };

    localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
    localStorage.setItem(EDIT_MODE_KEY, 'true');
    localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(EDIT_SESSION_KEY, sessionId);
  };

  const handleEdit = (branch: Branch) => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    saveEditSession(branch);
    navigate('/branch?edit=true');
  };

  const handleDelete = async (branchId: number) => {
    const branch = branches.find((b) => b.branchId === branchId);
    if (!branch) {
      toast.error('Branch not found.', { position: 'bottom-right', autoClose: 2000 });
      return;
    }

    confirm(
      'Delete Branch',
      `Are you sure you want to delete the branch "${branch.name}" at ${branch.location}? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`${BRANCHES_ENDPOINT}/${branchId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });

          if (await handleResponseError(response)) return;

          setBranches(branches.filter((b) => b.branchId !== branchId));
          setFilteredBranches(filteredBranches.filter((b) => b.branchId !== branchId));
          toast.success('Branch deleted successfully!', { position: 'bottom-right', autoClose: 2000 });
        } catch (err) {
          toast.error('Failed to delete branch. Please try again.', { position: 'bottom-right', autoClose: 2000 });
          console.error('Delete error:', err);
        } finally {
          setLoading(false);
        }
      },
      { type: 'danger', confirmText: 'Delete', showCancel: true }
    );
  };

  const handleAddNew = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    navigate('/branch?new=true');
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiMapPin className="mr-3 text-blue-600" size={28} />
              Branch Management
            </h2>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold hover-scale"
            >
              <FiPlus className="mr-2 h-5 w-5" />
              Add New Branch
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by branch name, location, or incharge..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              <select
                value={filterStatus}
                onChange={handleFilterStatus}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading branches...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-16">
              <FiMapPin className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No branches found.</p>
              <button
                onClick={handleAddNew}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add First Branch
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('branchId')}
                      >
                        ID {sortConfig.key === 'branchId' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        Branch Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('location')}
                      >
                        Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact Details</th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                        onClick={() => handleSort('inchargeName')}
                      >
                        Incharge Name {sortConfig.key === 'inchargeName' && (sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.map((branch, index) => (
                      <tr
                        key={branch.branchId}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{branch.branchId}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{branch.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{branch.location}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{branch.contactDetails}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{branch.inchargeName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              branch.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {branch.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEdit(branch)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover-scale transition-colors duration-200"
                              title="Edit Branch"
                              aria-label={`Edit branch ${branch.branchId}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(branch.branchId)}
                              className="p-2 text-red-600 hover:text-red-800 hover-scale transition-colors duration-200"
                              title="Delete Branch"
                              aria-label={`Delete branch ${branch.branchId}`}
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
                  Showing {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Branches: {filteredBranches.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BranchList;