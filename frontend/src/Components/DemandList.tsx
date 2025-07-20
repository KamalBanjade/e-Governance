import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiFileText, FiPlus, FiSearch } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { DemandType } from '../types/models';
import { useDialog } from '../Contexts/DialogContext';

const DemandList = () => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [filteredDemandTypes, setFilteredDemandTypes] = useState<DemandType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DemandType | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchDemandTypes();
  }, []);

  const fetchDemandTypes = async () => {
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

      const res = await fetch('http://localhost:5008/api/DemandType', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        toast.error('Session expired. Please log in again.', {
          position: 'top-right',
          autoClose: 2000,
        });
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

      const data = await res.json();
      setDemandTypes(data);
      setFilteredDemandTypes(data);
    } catch (err) {
      toast.error('Failed to fetch demand types. Please try again.', {
        position: 'top-right',
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
    const filtered = demandTypes.filter(
      dt =>
        dt.name.toLowerCase().includes(term) ||
        dt.description.toLowerCase().includes(term) ||
        dt.status.toLowerCase().includes(term)
    );
    setFilteredDemandTypes(filtered);
  };

  const handleSort = (key: keyof DemandType) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sorted = [...filteredDemandTypes].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredDemandTypes(sorted);
  };

  const handleEdit = (demandType: DemandType) => {
    localStorage.setItem('editDemandData', JSON.stringify(demandType));
    navigate('/demandForm?edit=true');
  };

  const handleDelete = async (id: number) => {
    const demandType = demandTypes.find(dt => dt.demandTypeId === id);
    if (!demandType) {
      toast.error('Demand type not found.', {
        position: 'top-right',
        autoClose: 2000,
      });
      return;
    }

    confirm(
      'Delete Demand Type',
      `Are you sure you want to delete the demand type "${demandType.name}"?`,
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

          const res = await fetch(`http://localhost:5008/api/DemandType/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401) {
            toast.error('You are not authorized. Please log in.', {
              position: 'top-right',
              autoClose: 2000,
            });
            navigate('/login');
            return;
          }

          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

          toast.success('Demand type deleted successfully!', {
            position: 'top-right',
            autoClose: 2000,
          });
          fetchDemandTypes();
        } catch (err) {
          toast.error('Failed to delete demand type. Please try again.', {
            position: 'top-right',
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
    localStorage.removeItem('editDemandData');
    navigate('/demandForm?new=true');
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-blue-600 h-8 w-8" />
              Demand Type List
            </h2>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold hover-scale"
            >
              <FiPlus className="mr-2 h-5 w-5" />
              Add New Demand Type
            </button>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search demand types..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full bg-gray-50 text-gray-900"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading demand types...</p>
            </div>
          ) : filteredDemandTypes.length === 0 ? (
            <div className="text-center py-16">
              <FiFileText className="mx-auto h-20 w-20 text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 font-medium">No demand types found.</p>
              <button
                onClick={handleAddNew}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center font-semibold mx-auto hover-scale"
              >
                <FiPlus className="mr-2 h-5 w-5" />
                Add First Demand Type
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-xl">
                  <thead>
                    <tr className="bg-gray-100">
                      {[
                        { label: 'ID', key: 'demandTypeId' },
                        { label: 'Name', key: 'name' },
                        { label: 'Description', key: 'description' },
                        { label: 'Status', key: 'status' },
                        { label: 'Actions', key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={key ? () => handleSort(key as keyof DemandType) : undefined}
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
                    {filteredDemandTypes.map((demandType, index) => (
                      <tr
                        key={demandType.demandTypeId}
                        className={`border-t border-gray-200 table-row transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{demandType.demandTypeId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{demandType.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{demandType.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              demandType.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {demandType.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(demandType)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              title="Edit Demand Type"
                              aria-label={`Edit demand type ${demandType.name}`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(demandType.demandTypeId)}
                              className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                              title="Delete Demand Type"
                              aria-label={`Delete demand type ${demandType.name}`}
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
                  Showing {filteredDemandTypes.length} demand type{filteredDemandTypes.length !== 1 ? 's' : ''}
                </div>
                <div className="text-base font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                  Total Demand Types: {demandTypes.length}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DemandList;