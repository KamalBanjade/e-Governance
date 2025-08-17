import { useEffect, useState, useRef } from 'react';
import { FiUser, FiX, FiUpload, FiSend, FiArrowLeft, FiEdit } from 'react-icons/fi';
import { useDialog } from '../Contexts/DialogContext';
import type { Customer, Branch, DemandType } from '../types/models';
import { formatDateForInput, formatDateForApi } from '../utility/dateFormatter';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


type CustomerFormData = Omit<Customer, 'cusId'> & { cusId?: number };

const EDIT_DATA_KEY = 'editCustomerData';
const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';
const PROFILE_COMPLETION_MODE_KEY = 'profileCompletionMode';

const CustomerForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [profileCompletionMode, setProfileCompletionMode] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const [customer, setCustomer] = useState<CustomerFormData>({
    scNo: '', name: '', address: '', dob: '', mobileNo: '', citizenshipNo: '',
    demandType: '', registeredBranchId: 0, citizenshipFile: null, houseFile: null
  });

  const token = localStorage.getItem('authToken');

  const generateUniqueSCNo = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    const combined = (timestamp + random).replace(/[^0-9]/g, '');

    const paddedNumbers = (combined + '000000000').substring(0, 9);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];

    return `${paddedNumbers.substring(0, 3)}.${paddedNumbers.substring(3, 5)}.${paddedNumbers.substring(5, 9)}${randomLetter}`;
  };

  const cleanupEditData = () => {
    localStorage.removeItem(EDIT_DATA_KEY);
    localStorage.removeItem(EDIT_MODE_KEY);
    localStorage.removeItem(EDIT_TIMESTAMP_KEY);
    localStorage.removeItem(EDIT_SESSION_KEY);
    localStorage.removeItem(PROFILE_COMPLETION_MODE_KEY);
  };

  const isEditSessionValid = () => {
    const editData = localStorage.getItem(EDIT_DATA_KEY);
    const isEdit = localStorage.getItem(EDIT_MODE_KEY) === 'true';
    const timestamp = localStorage.getItem(EDIT_TIMESTAMP_KEY);
    const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

    if (!editData || !isEdit || !timestamp || !sessionId) {
      return false;
    }

    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000;

    return sessionAge < maxAge;
  };

  const determineFormMode = () => {
    const urlParams = new URLSearchParams(location.search);
    const isNewCustomer = urlParams.get('new') === 'true';
    const isProfileCompletion = localStorage.getItem(PROFILE_COMPLETION_MODE_KEY) === 'true';

    if (isProfileCompletion) {
      setProfileCompletionMode(true);
      cleanupEditData();
      return 'profile';
    }

    if (isNewCustomer) {
      cleanupEditData();
      return 'create';
    }

    if (isEditSessionValid()) {
      return 'edit';
    }

    cleanupEditData();
    return 'create';
  };

  useEffect(() => {
    const mode = determineFormMode();

    if (mode === 'edit') {
      const editData = localStorage.getItem(EDIT_DATA_KEY);
      const sessionId = localStorage.getItem(EDIT_SESSION_KEY);

      if (editData && sessionId) {
        try {
          const parsed = JSON.parse(editData);
          setEditMode(true);
          setEditSessionId(sessionId);

          setCustomer({
            cusId: parsed.cusId,
            scNo: parsed.scNo,
            name: parsed.name,
            address: parsed.address,
            dob: formatDateForInput(parsed.dob),
            mobileNo: parsed.mobileNo,
            citizenshipNo: parsed.citizenshipNo,
            demandType: typeof parsed.demandType === 'object' && parsed.demandType?.name
              ? parsed.demandType.name
              : parsed.demandType || '',
            registeredBranchId: parsed.registeredBranchId,
            citizenshipFile: null,
            houseFile: null
          });
        } catch (error) {
          console.error('Error parsing edit data:', error);
          cleanupEditData();
          setEditMode(false);
          setCustomer(prev => ({
            ...prev,
            scNo: generateUniqueSCNo()
          }));
        }
      }
    } else if (mode === 'profile') {
      setEditMode(false);
      setCustomer(prev => ({
        ...prev,
        scNo: generateUniqueSCNo()
      }));
    } else {
      setEditMode(false);
      setProfileCompletionMode(false);
      setEditSessionId(null);
      setCustomer(prev => ({
        ...prev,
        scNo: generateUniqueSCNo()
      }));
    }

    isInitialMount.current = false;
  }, [location.search]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        confirm(
          'Authentication Required',
          'You need to login to access this page.',
          () => navigate('/login'),
          { type: 'danger', confirmText: 'Login' }
        );
        return;
      }

      try {
        const [branchRes, demandRes] = await Promise.all([
          fetch('http://localhost:5008/api/customers/branches', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('http://localhost:5008/api/customers/demandtypes', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!branchRes.ok || !demandRes.ok) {
          throw new Error('Dropdown fetch failed');
        }

        const [branchesData, demandTypesData] = await Promise.all([
          branchRes.json(),
          demandRes.json()
        ]);

        setBranches(branchesData);
        setDemandTypes(demandTypesData);
      } catch (error) {
        console.error('Error fetching dropdowns:', error);
        confirm(
          'Fetch Failed',
          'Could not load dropdown data. Please try again.',
          () => window.location.reload(),
          { type: 'danger' }
        );
      }
    };

    fetchDropdowns();
  }, [navigate, confirm, token]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editMode || profileCompletionMode) {
        localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());

        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editMode, profileCompletionMode]);

  useEffect(() => {
    if ((editMode || profileCompletionMode) && !isInitialMount.current) {
      const editData = {
        cusId: customer.cusId,
        scNo: customer.scNo,
        name: customer.name,
        address: customer.address,
        dob: customer.dob,
        mobileNo: customer.mobileNo,
       citizenshipNo: customer.citizenshipNo,
        demandType: customer.demandType,
        registeredBranchId: customer.registeredBranchId,
        timestamp: Date.now(),
        sessionId: editSessionId || Date.now().toString()
      };

      localStorage.setItem(EDIT_DATA_KEY, JSON.stringify(editData));
      localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
      if (profileCompletionMode) {
        localStorage.setItem(PROFILE_COMPLETION_MODE_KEY, 'true');
      }
    }
  }, [customer, editMode, profileCompletionMode, editSessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'mobileNo') {
      let cleaned = value.replace(/\D/g, '');

      if (cleaned.length > 0 && !cleaned.startsWith('977')) {
        cleaned = '977' + cleaned;
      }

      if (cleaned.length > 13) {
        cleaned = cleaned.slice(0, 13);
      }

      if (cleaned.length > 3) {
        formattedValue = `+977 | ${cleaned.slice(3)}`;
      } else {
        formattedValue = `+977 | `;
      }
    } else if (name === 'citizenshipNo') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 2) {
        formattedValue = cleaned;
      } else if (cleaned.length <= 4) {
        formattedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
      } else if (cleaned.length <= 6) {
        formattedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4)}`;
      } else if (cleaned.length <= 11) {
        formattedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6)}`;
      } else {
        formattedValue = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 11)}`;
      }
    }

    setCustomer(prev => ({
      ...prev,
      [name]: name === 'registeredBranchId' ? parseInt(formattedValue) : formattedValue
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setCustomer(prev => ({ ...prev, [e.target.name]: file }));
    }
  };

  const validateForm = () => {
    const { scNo, name, address, dob, mobileNo, citizenshipNo, demandType, registeredBranchId } = customer;

    if (!scNo || !name || !address || !mobileNo || !citizenshipNo || !demandType || !registeredBranchId) {
      return false;
    }

    if (!editMode && !profileCompletionMode && dob && !dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setCustomer({
      scNo: generateUniqueSCNo(),
      name: '', address: '', dob: '', mobileNo: '', citizenshipNo: '',
      demandType: '', registeredBranchId: 0, citizenshipFile: null, houseFile: null
    });
    setEditMode(false);
    setProfileCompletionMode(false);
    setEditSessionId(null);
    cleanupEditData();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      confirm(
        'Validation Error',
        'Please fill in all required fields correctly.',
        () => { },
        { type: 'warning', showCancel: false }
      );
      return;
    }

    confirm(
      profileCompletionMode ? 'Complete Profile' : (editMode ? 'Update Customer' : 'Register Customer'),
      profileCompletionMode
        ? `Are you sure you want to complete your profile (SC No: ${customer.scNo})?`
        : editMode
          ? `Are you sure you want to update ${customer.name} (SC No: ${customer.scNo})?`
          : `Are you sure you want to register ${customer.name} (SC No: ${customer.scNo})?`,
      async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem('authToken');
          if (!token) {
            confirm(
              'Authentication Required',
              'You need to login to perform this action',
              () => navigate('/login'),
              { type: 'danger', confirmText: 'Login' }
            );
            return;
          }

          if (editMode) {
            const response = await fetch(`http://localhost:5008/api/customers/${customer.cusId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                scNo: customer.scNo,
                name: customer.name,
                address: customer.address,
                dob: formatDateForApi(customer.dob),
                mobileNo: customer.mobileNo,
                citizenshipNo: customer.citizenshipNo,
                demandTypeId: demandTypes.find(dt => dt.name === customer.demandType)?.demandTypeId,
                registeredBranchId: customer.registeredBranchId
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to update customer');
            }

            toast.success('Customer updated successfully!', {
              position: "bottom-right",
              autoClose: 3000,
              onClose: () => {
                cleanupEditData();
                navigate('/customerList');
              }
            });
          } else {
            const formData = new FormData();

            formData.append("SCNo", customer.scNo);
            formData.append("Name", customer.name);
            formData.append("Address", customer.address);
            formData.append("DOB", formatDateForApi(customer.dob));
            formData.append("MobileNo", customer.mobileNo);
            formData.append("CitizenshipNo", customer.citizenshipNo);

            const selectedDemandType = demandTypes.find(dt => dt.name === customer.demandType);
            if (selectedDemandType) {
              formData.append("DemandTypeId", selectedDemandType.demandTypeId.toString());
            }

            formData.append("RegisteredBranchId", customer.registeredBranchId.toString());

            if (customer.citizenshipFile) {
              formData.append("CitizenshipFile", customer.citizenshipFile);
            }
            if (customer.houseFile) {
              formData.append("HouseFile", customer.houseFile);
            }

            const endpoint = profileCompletionMode ? 'http://localhost:5008/api/Customers/complete-profile' : 'http://localhost:5008/api/Customers/create';
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Server error response:', errorData);
              throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Success response:', result);

            toast.success('Customer created successfully!', {
              position: "bottom-right",
              autoClose: 3000,
              onClose: () => {
                resetForm();
              }
            });
          }
        } catch (error: any) {
          console.error('Submit error:', error);
          confirm(
            'Error',
            error.message || 'Failed to submit the form. Please try again.',
            () => { },
            { type: 'danger' }
          );
        } finally {
          setLoading(false);
        }
      },
      {
        type: profileCompletionMode ? 'info' : (editMode ? 'warning' : 'info'),
        confirmText: profileCompletionMode ? 'Complete Profile' : (editMode ? 'Update' : 'Register')
      }
    );
  };

  const handleCancel = () => {
    if (editMode || profileCompletionMode) {
      confirm(
        'Cancel',
        'Are you sure you want to cancel? Any unsaved changes will be lost.',
        () => {
          cleanupEditData();
          navigate(profileCompletionMode ? '/' : '/customerList');
        },
        { type: 'warning', confirmText: 'Yes, Cancel' }
      );
    } else {
      resetForm();
    }
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white px-4 py-10">
        <div className="max-w-2xl w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
              {editMode ? <FiEdit className="w-6 h-6" /> : <FiUser className="w-6 h-6" />}
            </div>
            <h2 className="text-3xl font-semibold text-gray-800">
              {profileCompletionMode ? 'Complete Your Profile' : (editMode ? 'Edit Customer' : 'Register New Customer')}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {profileCompletionMode ? 'Step 2 of 2 - Customer Information' : 'Customer Information'}
            </p>
          </div>

          {editMode && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Editing Customer
              </h4>
              <p className="text-sm text-blue-700">
                You are editing: <strong>{customer.name}</strong> (SC No: {customer.scNo})
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Basic Information</h3>

              <InputField
                label="SC No *"
                name="scNo"
                value={customer.scNo}
                onChange={handleChange}
                disabled={true}
                focusedField={null}
                setFocusedField={() => { }}
                placeholder="Auto-generated SC No"
              />
              {!editMode && !profileCompletionMode && (
                <p className="text-xs text-gray-500 mt-1">
                  SC No is automatically generated for new customers
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Name *"
                  name="name"
                  value={customer.name}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Name"
                />
                <InputField
                  label="Address *"
                  name="address"
                  value={customer.address}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Enter Address"
                />
                <InputField
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={customer.dob}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="Select Date of Birth"
                />
                <InputField
                  label="Mobile No *"
                  name="mobileNo"
                  value={customer.mobileNo}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="+977 | 1234567890"
                  helperText="Format: +977 | followed by 10 digits"
                />
                <InputField
                  label="Citizenship No *"
                  name="citizenshipNo"
                  value={customer.citizenshipNo}
                  onChange={handleChange}
                  focusedField={null}
                  setFocusedField={() => { }}
                  placeholder="12-34-56-78901"
                  helperText="Format: 12-34-56-78901"
                />
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Service Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Demand Type *"
                  name="demandType"
                  value={customer.demandType}
                  onChange={handleChange}
                  options={demandTypes}
                  placeholder="Select Demand Type"
                />
                <SelectField
                  label="Branch *"
                  name="registeredBranchId"
                  value={customer.registeredBranchId}
                  onChange={handleChange}
                  options={branches}
                  placeholder="Select Branch"
                  defaultValue={editMode ? customer.registeredBranchId : 0}
                />
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Document Uploads (Optional)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField
                  label="Citizenship File"
                  name="citizenshipFile"
                  file={customer.citizenshipFile}
                  onFileChange={handleFileChange}
                  onRemove={() => setCustomer(prev => ({ ...prev, citizenshipFile: null }))}
                />
                <FileUploadField
                  label="House File"
                  name="houseFile"
                  file={customer.houseFile}
                  onFileChange={handleFileChange}
                  onRemove={() => setCustomer(prev => ({ ...prev, houseFile: null }))}
                />
              </div>
              {editMode && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to keep existing file
                </p>
              )}
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
              {loading ? (profileCompletionMode ? 'Completing Profile...' : (editMode ? 'Updating...' : 'Submitting...')) : (profileCompletionMode ? 'Complete Profile' : (editMode ? 'Update' : 'Register'))}
            </button>
          </div>

          {(editMode || profileCompletionMode) && (
            <div className="pt-4 text-center">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-full text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FiArrowLeft className="mr-2 h-5 w-5" />
                {profileCompletionMode ? 'Back to Home' : 'Back to List'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

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
      {helperText && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Branch[] | DemandType[];
  placeholder?: string;
  defaultValue?: string | number;
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
        className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            key={'branchId' in option ? option.branchId : option.demandTypeId}
            value={name === 'demandType' ? option.name : ('branchId' in option ? option.branchId : option.demandTypeId)}
          >
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

interface FileUploadFieldProps {
  label: string;
  name: string;
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  name,
  file,
  onFileChange,
  onRemove,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="border border-gray-300 rounded-xl p-4 transition duration-200 ease-in-out">
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FiUpload className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700 truncate">
                {file.name}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="text-red-600 hover:text-red-800"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <div className="text-sm text-gray-600">
              <label
                htmlFor={name}
                className="cursor-pointer text-blue-600 hover:text-blue-500"
              >
                Click to upload
              </label>
              <p className="mt-1">or drag and drop</p>
            </div>
            <input
              id={name}
              name={name}
              type="file"
              onChange={onFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerForm;