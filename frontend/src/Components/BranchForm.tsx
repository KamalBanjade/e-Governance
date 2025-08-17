import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMapPin, FiSend, FiMap, FiArrowLeft } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDialog } from '../Contexts/DialogContext';
import { v4 as uuidv4 } from 'uuid';
import { getAuthToken } from '../utility/auth';
import type { Branch } from '../types/models';

// Constants
const EDIT_DATA_KEY = 'editBranchData';
const EDIT_MODE_KEY = 'isEditBranchOperation';
const EDIT_TIMESTAMP_KEY = 'editBranchTimestamp';
const EDIT_SESSION_KEY = 'editBranchSessionId';
const API_BASE_URL = 'http://localhost:5008/api';
const BRANCHES_ENDPOINT = `${API_BASE_URL}/Branch`;

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
  focusedField: string | null;
  setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
  placeholder?: string;
  helperText?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  type = 'text',
  setFocusedField,
  placeholder,
  helperText,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocusedField(name)}
        onBlur={() => setFocusedField(null)}
        className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
        placeholder={placeholder}
        autoComplete="off"
      />
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id: string | number; name: string }>;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const BranchForm = () => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const defaultFormState: Branch = {
    branchId: 0,
    name: '',
    location: '',
    contactDetails: '',
    inchargeName: '',
    status: 'Active',
  };

  const [formData, setFormData] = useState<Branch>(defaultFormState);

  // Helper functions
  const getAuthHeaders = () => {
    if (!token) throw new Error('No authentication token available');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const handleResponseError = async (response: Response) => {
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

  const cleanupEditData = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
  };

  const isEditSessionValid = () => {
    const editData = localStorage.getItem(EDIT_DATA_KEY);
    const isEdit = localStorage.getItem(EDIT_MODE_KEY) === 'true';
    const timestamp = localStorage.getItem(EDIT_TIMESTAMP_KEY);
    const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

    if (!editData || !isEdit || !timestamp || !sessionId) return false;

    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return sessionAge < maxAge;
  };

 const determineFormMode = () => {
  const urlParams = new URLSearchParams(location.search);
  const isNewBranch = urlParams.get('new') === 'true';

  if (isNewBranch) {
    cleanupEditData();
    return 'create';
  }

  if (isEditSessionValid()) {
    return 'edit';
  }

  // If no valid edit and no ?new=true, clean up stale keys just in case:
  cleanupEditData();
  return 'create';
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

    const mode = determineFormMode();

    if (mode === 'create') {
      setFormData(defaultFormState);
      setIsEditing(false);
      setEditSessionId(null);
      cleanupEditData();
    } else if (mode === 'edit') {
      const editData = localStorage.getItem(EDIT_DATA_KEY);
      const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

      if (editData && sessionId) {
        try {
          const parsed = JSON.parse(editData);
          setIsEditing(true);
          setEditSessionId(sessionId);
          setFormData({
            branchId: parsed.branchId || 0,
            name: parsed.name || '',
            location: parsed.location || '',
            contactDetails: parsed.contactDetails || '',
            inchargeName: parsed.inchargeName || '',
            status: parsed.status || 'Active',
          });
        } catch (error) {
          console.error('Error parsing edit data:', error);
          confirm(
            'Error',
            'Failed to load branch data. Starting with a new form.',
            () => {
              cleanupEditData();
              setIsEditing(false);
              setFormData(defaultFormState);
            },
            { type: 'danger', showCancel: false }
          );
        }
      }
    }

    isInitialMount.current = false;
  }, [location.search, token, navigate, confirm]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && !isInitialMount.current) {
      const editData = {
        branchId: formData.branchId,
        name: formData.name,
        location: formData.location,
        contactDetails: formData.contactDetails,
        inchargeName: formData.inchargeName,
        status: formData.status,
        timestamp: Date.now(),
        sessionId: editSessionId || uuidv4(),
      };

      localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
      localStorage.setItem(EDIT_MODE_KEY, 'true');
      localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
      localStorage.setItem(EDIT_SESSION_KEY, editData.sessionId);
    }
  }, [formData, isEditing, editSessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, location, contactDetails, inchargeName } = formData;
    return name.trim() && location.trim() && contactDetails.trim() && inchargeName.trim();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      confirm(
        'Validation Error',
        'Please fill in all required fields correctly.',
        () => {},
        { type: 'warning', showCancel: false }
      );
      return;
    }

    confirm(
      isEditing ? 'Update Branch' : 'Create Branch',
      isEditing
        ? `Are you sure you want to update the branch "${formData.name}"?`
        : `Are you sure you want to create the branch "${formData.name}"?`,
      async () => {
        setLoading(true);
        try {
          const url = isEditing
            ? `${BRANCHES_ENDPOINT}/${formData.branchId}`
            : BRANCHES_ENDPOINT;
          const method = isEditing ? 'PUT' : 'POST';

          const dataToSend = isEditing ? formData : {
            name: formData.name,
            location: formData.location,
            contactDetails: formData.contactDetails,
            inchargeName: formData.inchargeName,
            status: formData.status,
          };

          const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(dataToSend),
          });

          if (await handleResponseError(response)) return;

          toast.success(isEditing ? 'Branch updated successfully!' : 'Branch created successfully!', {
            position: 'bottom-right',
            autoClose: 3000,
            onClose: () => {
              cleanupEditData();
              setFormData(defaultFormState);
              setIsEditing(false);
              if (isEditing) navigate('/branchList');
            },
          });
        } catch (err) {
          confirm(
            'Error',
            'Failed to save branch. Please try again.',
            () => {},
            { type: 'danger', showCancel: false }
          );
          console.error('Submit error:', err);
        } finally {
          setLoading(false);
        }
      },
      {
        type: isEditing ? 'warning' : 'info',
        confirmText: isEditing ? 'Update' : 'Create',
        showCancel: true,
      }
    );
  };

  const handleCancel = () => {
    confirm(
      'Cancel',
      'Are you sure you want to cancel? Any unsaved changes will be lost.',
      () => {
        cleanupEditData();
        setFormData(defaultFormState);
        setIsEditing(false);
        navigate('/branchList');
      },
      { type: 'warning', confirmText: 'Yes, Cancel', showCancel: true }
    );
  };

  if (!token) return null; // Handled by useEffect

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white px-4 py-10">
        <div className="max-w-2xl w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
              {isEditing ? <FiMap className="w-6 h-6" /> : <FiMapPin className="w-6 h-6" />}
            </div>
            <h2 className="text-3xl font-semibold text-gray-800">
              {isEditing ? 'Edit Branch' : 'Add New Branch'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">Branch Information</p>
          </div>

          {isEditing && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Editing Branch
              </h4>
              <p className="text-sm text-blue-700">
                You are editing: <strong>{formData.name}</strong> (Location: {formData.location})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your changes are being saved automatically. You can safely refresh the page.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Branch Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Branch Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  placeholder="Enter Branch Name"
                />
                <InputField
                  label="Location *"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  placeholder="Enter Location"
                />
                <InputField
                  label="Contact Details *"
                  name="contactDetails"
                  value={formData.contactDetails}
                  onChange={handleChange}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  placeholder="Enter Contact Details"
                />
                <InputField
                  label="Incharge Name *"
                  name="inchargeName"
                  value={formData.inchargeName}
                  onChange={handleChange}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  placeholder="Enter Incharge Name"
                />
                <SelectField
                  label="Status *"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={[
                    { id: 'Active', name: 'Active' },
                    { id: 'Inactive', name: 'Inactive' },
                  ]}
                  placeholder="Select Status"
                />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
            >
              <FiSend className="mr-2 h-5 w-5" />
              {loading ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>

          {isEditing && (
            <div className="pt-4 text-center">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-full text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FiArrowLeft className="mr-2 h-5 w-5" />
                Back to List
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BranchForm;