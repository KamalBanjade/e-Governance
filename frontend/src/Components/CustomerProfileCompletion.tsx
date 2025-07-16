import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUser, FiUpload, FiX } from 'react-icons/fi';


interface Branch {
    branchId: number;
    name: string;
}

interface DemandType {
    demandTypeId: number;
    name: string;
    description: string;
}

const CustomerProfileCompletion = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [form, setForm] = useState({
        scNo: '',
        mobileNo: '',
        citizenshipNo: '',
        address: '',
        dob: '',
        demandTypeId: '',
        registeredBranchId: '',
    });

    const [files, setFiles] = useState({
        citizenshipFile: null as File | null,
        houseFile: null as File | null,
    });

    // Function to generate unique SC No in format nnn.nn.nnnnA (like in CustomerForm)
    const generateUniqueSCNo = () => {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        const combined = (timestamp + random).replace(/[^0-9]/g, '');
        
        // Ensure we have at least 9 digits
        const paddedNumbers = (combined + '000000000').substring(0, 9);
        
        // Get a random letter
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        
        // Format as nnn.nn.nnnnA
        return `${paddedNumbers.substring(0, 3)}.${paddedNumbers.substring(3, 5)}.${paddedNumbers.substring(5, 9)}${randomLetter}`;
    };

    // Validation functions
const validateMobileNumber = (mobile: string): boolean => {
    // Remove flag, spaces, and formatting, keep only digits and +
    const cleanMobile = mobile.replace(/\u{1F1F3}\u{1F1F5}|\s+|\|/gu, '');
    // Check if it matches +977 followed by 10 digits
    const mobileRegex = /^\+977\d{10}$/;
    return mobileRegex.test(cleanMobile);
};

const formatMobileNumber = (value: string): string => {
    let cleaned = value.replace(/\u{1F1F3}\u{1F1F5}|\s+|\|/gu, '').replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+977')) {
        if (cleaned.startsWith('977')) {
            cleaned = '+' + cleaned;
        } else if (cleaned.startsWith('9')) {
            cleaned = '+977' + cleaned;
        } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
            cleaned = '+977' + cleaned;
        }
    }
    if (cleaned.length > 14) {
        cleaned = cleaned.substring(0, 14);
    }
    if (cleaned.length >= 4) {
        const countryCode = cleaned.substring(0, 4); // +977
        const number = cleaned.substring(4);
        return `\u{1F1F3}\u{1F1F5} ${countryCode} | ${number}`;
    } else if (cleaned.length > 0) {
        return `\u{1F1F3}\u{1F1F5} ${cleaned}`;
    }
    return cleaned;
};
   const validateCitizenshipNumber = (citizenship: string): boolean => {
        // Check if it matches format 12-34-56-78901 (2-2-2-5 digits with hyphens)
        const citizenshipRegex = /^\d{2}-\d{2}-\d{2}-\d{5}$/;
        return citizenshipRegex.test(citizenship);
    };

    // Format citizenship number as user types
    const formatCitizenshipNumber = (value: string): string => {
        // Remove all non-digit characters
        const cleaned = value.replace(/\D/g, '');
        
        // Apply format 12-34-56-78901 (2-2-2-5)
        if (cleaned.length <= 2) {
            return cleaned;
        } else if (cleaned.length <= 4) {
            return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
        } else if (cleaned.length <= 6) {
            return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4)}`;
        } else if (cleaned.length <= 11) {
            return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6)}`;
        } else {
            // Limit to 11 digits total
            return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 11)}`;
        }
    };

    // Initialize form with generated SC No
    useEffect(() => {
        setForm(prev => ({
            ...prev,
            scNo: generateUniqueSCNo()
        }));
    }, []);

    // Load branches and demand types
    useEffect(() => {
        const loadData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const [branchesRes, demandTypesRes] = await Promise.all([
                    fetch('http://localhost:5008/api/Customers/branches', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch('http://localhost:5008/api/Customers/demandtypes', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (branchesRes.ok && demandTypesRes.ok) {
                    const branchesData = await branchesRes.json();
                    const demandTypesData = await demandTypesRes.json();
                    setBranches(branchesData);
                    setDemandTypes(demandTypesData);
                } else {
                    toast.error('Failed to load required data');
                }
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Failed to load required data');
            }
        };

        loadData();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        let formattedValue = value;
        
        // Apply formatting based on field name
        if (name === 'mobileNo') {
            formattedValue = formatMobileNumber(value);
        } else if (name === 'citizenshipNo') {
            formattedValue = formatCitizenshipNumber(value);
        }
        
        setForm({ ...form, [name]: formattedValue });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: fileList } = e.target;
        if (fileList && fileList.length > 0) {
            setFiles({ ...files, [name]: fileList[0] });
        }
    };

    const removeFile = (fileType: 'citizenshipFile' | 'houseFile') => {
        setFiles({ ...files, [fileType]: null });
        // Clear the file input
        const fileInput = document.getElementById(fileType) as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setErrors([]);
        setIsLoading(true);

        const validationErrors: string[] = [];

        // Validate required fields
        if (!form.scNo || !form.mobileNo || !form.citizenshipNo || !form.address ||
            !form.demandTypeId || !form.registeredBranchId) {
            validationErrors.push('All required fields must be filled.');
        }

        // Validate mobile number format
        if (form.mobileNo && !validateMobileNumber(form.mobileNo)) {
            validationErrors.push('Mobile number must be in format 🇳🇵 +977 | followed by 10 digits (e.g., 🇳🇵 +977 | 1234567890).');
        }

        // Validate citizenship number format
        if (form.citizenshipNo && !validateCitizenshipNumber(form.citizenshipNo)) {
            validationErrors.push('Citizenship number must be in format 12-34-56-78901.');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.error(validationErrors[0]);
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('SCNo', form.scNo);
            formData.append('MobileNo', form.mobileNo);
            formData.append('CitizenshipNo', form.citizenshipNo);
            formData.append('Address', form.address);
            formData.append('DemandTypeId', form.demandTypeId);
            formData.append('RegisteredBranchId', form.registeredBranchId);

            // Add DOB if provided
            if (form.dob) {
                formData.append('DOB', form.dob);
            }

            // Add files if selected
            if (files.citizenshipFile) {
                formData.append('CitizenshipFile', files.citizenshipFile);
            }
            if (files.houseFile) {
                formData.append('HouseFile', files.houseFile);
            }

            const response = await fetch('http://localhost:5008/api/Customers/complete-profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                // Clear the requiresCustomerProfile flag since profile is now complete
                localStorage.removeItem('requiresCustomerProfile');
                toast.success('Customer profile completed successfully!');
                navigate('/customer-dashboard');
            } else {
                if (result.errors) {
                    const errorMessages: string[] = [];
                    Object.keys(result.errors).forEach((key) => {
                        result.errors[key].forEach((error: string) =>
                            errorMessages.push(`${key}: ${error}`)
                        );
                    });
                    setErrors(errorMessages);
                    if (errorMessages.length > 0) toast.error(errorMessages[0]);
                } else {
                    const errorMessage = result.message || 'Profile completion failed';
                    setErrors([errorMessage]);
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            console.error('Error completing profile:', error);
            const errorMessage = 'Network error occurred. Please check your connection.';
            setErrors([errorMessage]);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white px-4 py-10">
            <div className="max-w-2xl w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
                        <FiUser className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-semibold text-gray-800">Complete Your Profile</h2>
                    <p className="text-sm text-gray-600 mt-2">Step 2 of 2 - Customer Information</p>
                </div>

                {errors.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-2">
                            Please fix the following errors:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-5">
                        <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                            Basic Information
                        </h3>
                        
                        <InputField
                            label="SC Number *"
                            name="scNo"
                            value={form.scNo}
                            onChange={handleChange}
                            onKeyPress={handleKeyPress}
                            disabled={true}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            placeholder="Auto-generated SC Number"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                label="Mobile Number *"
                                name="mobileNo"
                                value={form.mobileNo}
                                onChange={handleChange}
                                onKeyPress={handleKeyPress}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                placeholder="🇳🇵 +977 | 1234567890"
                                helperText="Format:+977 | followed by 10 digits"
                            />
                            <InputField
                                label="Citizenship Number *"
                                name="citizenshipNo"
                                value={form.citizenshipNo}
                                onChange={handleChange}
                                onKeyPress={handleKeyPress}
                             
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                placeholder="12-34-56-78901"
                                helperText="Format: 12-34-56-78901"
                            />
                       

                        <InputField
                            label="Address *"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            placeholder="Enter Address"
                        />

                        <InputField
                            label="Date of Birth"
                            name="dob"
                            type="date"
                            value={form.dob}
                            onChange={handleChange}
                            disabled={isLoading}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            placeholder="Select Date of Birth"
                        />
                         </div>
                    </div>

                    {/* Service Information */}
                    <div className="space-y-5">
                        <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                            Service Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField
                                label="Demand Type *"
                                name="demandTypeId"
                                value={form.demandTypeId}
                                onChange={handleChange}
                                disabled={isLoading}
                                options={demandTypes}
                                placeholder="Select Demand Type"
                            />
                            <SelectField
                                label="Registered Branch *"
                                name="registeredBranchId"
                                value={form.registeredBranchId}
                                onChange={handleChange}
                                disabled={isLoading}
                                options={branches}
                                placeholder="Select Branch"
                            />
                        </div>
                    </div>

                    {/* File Uploads */}
                    <div className="space-y-5">
                        <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                            Document Uploads (Optional)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileUploadField
                                label="Citizenship Document"
                                name="citizenshipFile"
                                file={files.citizenshipFile}
                                onFileChange={handleFileChange}
                                onRemove={() => removeFile('citizenshipFile')}
                                disabled={isLoading}
                            />
                            <FileUploadField
                                label="House Details Document"
                                name="houseFile"
                                file={files.houseFile}
                                onFileChange={handleFileChange}
                                onRemove={() => removeFile('houseFile')}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? 'Completing Profile...' : 'Complete Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
    onKeyPress,
    disabled = false,
    type = 'text',
    setFocusedField,
    placeholder,
    helperText,
}) => {
    return (
        <div>
            <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 mb-2"
            >
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onKeyPress={onKeyPress}
                disabled={disabled}
                onFocus={() => setFocusedField(name)}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                placeholder={placeholder}
                autoComplete="off"
            />
            {name === 'scNo' && (
                <p className="text-xs text-gray-500 mt-1">
                    SC Number is automatically generated and cannot be changed
                </p>
            )}
            {helperText && (
                <p className="text-xs text-gray-500 mt-1">
                    {helperText}
                </p>
            )}
        </div>
    );
};

interface SelectFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    options: Branch[] | DemandType[];
    placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
    label,
    name,
    value,
    onChange,
    disabled = false,
    options,
    placeholder,
}) => {
    return (
        <div>
            <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 mb-2"
            >
                {label}
            </label>
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option 
                        key={'branchId' in option ? option.branchId : option.demandTypeId} 
                        value={'branchId' in option ? option.branchId : option.demandTypeId}
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
    disabled?: boolean;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
    label,
    name,
    file,
    onFileChange,
    onRemove,
    disabled = false,
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
                            disabled={disabled}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
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
                            disabled={disabled}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerProfileCompletion;