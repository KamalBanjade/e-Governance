import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiUser, FiCalendar, FiPhone, FiHome, FiFileText,
    FiMapPin, FiEdit2, FiDownload, FiAlertCircle, FiCheck,
    FiBriefcase, FiMail, FiUsers
} from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../Components/AuthContext';
import { getAuthToken } from '../utility/auth';
import { useDialog } from '../Contexts/DialogContext';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

interface DemandType {
    demandTypeId?: number;
    name: string;
    description?: string;
    status?: string;
}

interface Customer {
    customerId?: number;
    name: string;
    dob: string;
    mobileNo: string;
    address: string;
    cusId: string;
    scNo: string;
    citizenshipNo: string;
    registeredBranch?: {
        name: string;
        address?: string;
    };
    demandType?: DemandType;
    citizenshipPath?: string;
    houseDetailsPath?: string;
    registrationMonth?: string;
    registrationYear?: string;
}

interface Employee {
    empId: number;
    name: string;
    contactNo: string;
    status: string;
    branchId: number;
    employeeTypeId: number;
    userId: string;
    branchName: string;
    employeeTypeName: string;
    email: string;
    username: string;
    address: string;
    dob: string;
    userTypeId: number;
}

const EDIT_MODE_KEY = 'isEditOperation';
const EDIT_TIMESTAMP_KEY = 'editTimestamp';
const EDIT_SESSION_KEY = 'editSessionId';

const Profile = () => {
    const { isAuthenticated, userRole } = useAuth();
    const token = getAuthToken();
    const navigate = useNavigate();
    const { confirm } = useDialog();
    
    const [profileData, setProfileData] = useState<Customer | Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    
    // Get user type from localStorage
    const userTypeId = localStorage.getItem('userTypeId');
    const isCustomer = userTypeId === '3';
    const isEmployee = userTypeId === '2';

    useEffect(() => {
        if (!isAuthenticated || !token) {
            confirm(
                'Authentication Required',
                'You need to log in to access your profile.',
                () => navigate('/login'),
                { type: 'danger', confirmText: 'Login', showCancel: false }
            );
            setAuthChecked(true);
            return;
        }
        
        fetchProfile();
    }, [isAuthenticated, token, navigate, confirm, userRole]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            let endpoint = '';
            
            if (isCustomer) {
                endpoint = 'http://localhost:5008/api/Customers/by-user';
            } else if (isEmployee) {
                // Use the new endpoint that gets employee by current logged-in user
                endpoint = 'http://localhost:5008/api/employeedetails/by-current-user';
            } else {
                throw new Error('Invalid user type');
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                toast.error('Session expired. Please log in again.');
                navigate('/login');
                return;
            }

            if (!response.ok) {
                // Handle 404 and other errors properly
                let errorMessage = 'Failed to fetch profile';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setProfileData(data);
        } catch (err) {
            const error = err as Error;
            console.error('Failed to load profile:', error);
            toast.error(error.message || 'Failed to load your profile');
        } finally {
            setLoading(false);
            setAuthChecked(true);
        }
    };

    const saveEditSession = (data: Customer | Employee) => {
        const sessionId = uuidv4();
        const editData = {
            ...data,
            timestamp: Date.now(),
            sessionId,
        };
        
        const dataKey = isCustomer ? 'editCustomerData' : 'editEmployeeData';
        localStorage.setItem(dataKey, JSON.stringify(editData));
        localStorage.setItem(EDIT_MODE_KEY, 'true');
        localStorage.setItem(EDIT_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(EDIT_SESSION_KEY, sessionId);
    };

    const handleEditProfile = () => {
        if (profileData) {
            // Clear previous edit data
            localStorage.removeItem('editCustomerData');
            localStorage.removeItem('editEmployeeData');
            localStorage.removeItem(EDIT_MODE_KEY);
            localStorage.removeItem(EDIT_TIMESTAMP_KEY);
            localStorage.removeItem(EDIT_SESSION_KEY);
            
            saveEditSession(profileData);
            
            if (isCustomer) {
                navigate('/Customers/create?edit=true');
            } else if (isEmployee) {
                navigate('/employees/create?edit=true');
            }
        } else {
            toast.error('No profile data available to edit.');
        }
    };

    const handleDownloadDocument = (docType: 'citizenship' | 'house') => {
        if (!profileData || !isCustomer) return;
        const customer = profileData as Customer;
        const path = docType === 'citizenship' ? customer.citizenshipPath : customer.houseDetailsPath;
        if (!path) {
            toast.warn(`${docType === 'citizenship' ? 'Citizenship' : 'House'} document not available`);
            return;
        }
        const fullUrl = `http://localhost:5008${path}`;
        window.open(fullUrl, '_blank');
    };

    const calculateProfileCompleteness = () => {
        if (!profileData) return 0;
        
        if (isCustomer) {
            const customer = profileData as Customer;
            const fields = [
                customer.name,
                customer.dob,
                customer.mobileNo,
                customer.address,
                customer.cusId,
                customer.demandType?.name,
                customer.citizenshipNo,
                customer.citizenshipPath,
                customer.houseDetailsPath,
            ];
            const completedFields = fields.filter(Boolean).length;
            return Math.round((completedFields / fields.length) * 100);
        } else if (isEmployee) {
            const employee = profileData as Employee;
            const fields = [
                employee.name,
                employee.email,
                employee.contactNo,
                employee.address,
                employee.dob,
                employee.username,
                employee.branchName,
                employee.employeeTypeName,
            ];
            const completedFields = fields.filter(Boolean).length;
            return Math.round((completedFields / fields.length) * 100);
        }
        return 0;
    };

    if (!authChecked) return null;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mb-6"
                    />
                    <h2 className="text-2xl font-semibold text-gray-800">Loading your profile</h2>
                    <p className="text-gray-500 mt-2">Please wait while we retrieve your information</p>
                </motion.div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-gray-100"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
                        <FiAlertCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        We couldn't find your {isCustomer ? 'customer' : 'employee'} profile. Please complete your profile setup.
                    </p>
                    <button
                        onClick={() => navigate('/complete-profile')}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        Complete Profile
                    </button>
                </motion.div>
            </div>
        );
    }

    const completeness = calculateProfileCompleteness();

    return (
        <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-white to-blue-100 transition-all duration-300 py-13 rounded-lg">
            <ToastContainer position="bottom-right" autoClose={3000} />

            <div className="max-w-4xl mx-auto -mt-12">
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative bg-white rounded-xl shadow-md border border-gray-100 px-8 py-6"
                >
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                <FiUser className="text-white text-2xl" />
                            </div>
                            <span className="absolute bottom-0 right-0 bg-green-400 border-2 border-white w-4 h-4 rounded-full block"></span>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Top Row - Name and Edit Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">{profileData.name}</h1>
                                    <p className="text-gray-600">
                                        Welcome back, <span className="font-medium text-blue-600">{profileData.name.split(' ')[0]}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={handleEditProfile}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                                >
                                    <FiEdit2 size={14} /> Edit Profile
                                </button>
                            </div>

                            {/* Middle Row - Tags */}
                            <div className="flex flex-wrap gap-2">
                                {isCustomer && (
                                    <>
                                        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-medium">
                                            Customer ID: {(profileData as Customer).cusId}
                                        </span>
                                        <span className="inline-block bg-gray-50 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                                            Service No: {(profileData as Customer).scNo}
                                        </span>
                                    </>
                                )}
                                {isEmployee && (
                                    <>
                                        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-medium">
                                            Employee ID: {(profileData as Employee).empId}
                                        </span>
                                        <span className="inline-block bg-gray-50 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                                            Username: {(profileData as Employee).username}
                                        </span>
                                        <span className={`inline-block text-xs px-2.5 py-1 rounded-md font-medium ${(profileData as Employee).status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            Status: {(profileData as Employee).status}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Bottom Row - Compact Progress */}
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 max-w-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-gray-500">Profile Complete</span>
                                        <span className="text-xs font-semibold text-blue-600">{completeness}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${completeness}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className={`h-1.5 rounded-full ${completeness === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        />
                                    </div>
                                </div>
                                <p className={`text-xs ${completeness === 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {completeness === 100 ? (
                                        <span className="flex items-center">
                                            <FiCheck className="mr-1" /> Complete
                                        </span>
                                    ) : (
                                        `${Math.ceil((100 - completeness) / 12.5)} fields remaining`
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Personal & Account Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Personal Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                <FiUser className="text-blue-600" /> Personal Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <InfoRow icon={<FiUser />} label="Full Name" value={profileData.name} />
                            <InfoRow
                                icon={<FiCalendar />}
                                label="Date of Birth"
                                value={new Date(profileData.dob).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            />
                            <InfoRow 
                                icon={<FiPhone />} 
                                label="Mobile Number" 
                                value={isCustomer ? (profileData as Customer).mobileNo : (profileData as Employee).contactNo} 
                            />
                            <InfoRow icon={<FiHome />} label="Address" value={profileData.address} />
                            {isEmployee && (
                                <InfoRow icon={<FiMail />} label="Email" value={(profileData as Employee).email} />
                            )}
                        </div>
                    </motion.div>

                    {/* Account Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                {isCustomer ? <FiFileText className="text-blue-600" /> : <FiBriefcase className="text-blue-600" />}
                                {isCustomer ? 'Account Details' : 'Employment Details'}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {isCustomer && (
                                <>
                                    <InfoRow
                                        icon={<FiFileText />}
                                        label="Demand Type"
                                        value={(profileData as Customer).demandType?.name || 'Not specified'}
                                        sub={(profileData as Customer).demandType?.description}
                                    />
                                    <InfoRow
                                        icon={<FiCalendar />}
                                        label="Registration Date"
                                        value={`${(profileData as Customer).registrationMonth} ${(profileData as Customer).registrationYear || ''}`}
                                    />
                                    <InfoRow
                                        icon={<FiMapPin />}
                                        label="Registered Branch"
                                        value={(profileData as Customer).registeredBranch?.name || 'Not specified'}
                                        sub={(profileData as Customer).registeredBranch?.address}
                                    />
                                    <InfoRow icon={<FiFileText />} label="Citizenship No." value={(profileData as Customer).citizenshipNo} />
                                </>
                            )}
                            {isEmployee && (
                                <>
                                    <InfoRow
                                        icon={<FiUsers />}
                                        label="Employee Type"
                                        value={(profileData as Employee).employeeTypeName || 'Not specified'}
                                    />
                                    <InfoRow
                                        icon={<FiMapPin />}
                                        label="Branch"
                                        value={(profileData as Employee).branchName || 'Not specified'}
                                    />
                                    <InfoRow
                                        icon={<FiUser />}
                                        label="Username"
                                        value={(profileData as Employee).username}
                                    />
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Documents (Customer only) or Additional Info */}
                <div className="space-y-8">
                    {isCustomer && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <FiDownload className="text-blue-600" /> Documents
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <DocumentItem
                                    title="Citizenship Document"
                                    hasDoc={!!(profileData as Customer).citizenshipPath}
                                    onDownload={() => handleDownloadDocument('citizenship')}
                                />
                                <DocumentItem
                                    title="House Details"
                                    hasDoc={!!(profileData as Customer).houseDetailsPath}
                                    onDownload={() => handleDownloadDocument('house')}
                                />
                            </div>
                        </motion.div>
                    )}
                    
                    {isEmployee && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <FiBriefcase className="text-blue-600" /> Work Information
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${(profileData as Employee).status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            <FiUsers />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-800">Employment Status</h3>
                                            <p className={`text-xs ${(profileData as Employee).status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                                                Currently {(profileData as Employee).status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                            <FiMapPin />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-800">Work Location</h3>
                                            <p className="text-xs text-gray-500">
                                                {(profileData as Employee).branchName}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Reusable Components
const InfoRow = ({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) => (
    <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-base font-normal text-gray-800">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    </div>
);

const DocumentItem = ({
    title,
    hasDoc,
    onDownload,
}: {
    title: string;
    hasDoc: boolean;
    onDownload: () => void;
}) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasDoc ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <FiFileText />
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-800">{title}</h3>
                <p className={`text-xs ${hasDoc ? 'text-green-600' : 'text-gray-500'}`}>
                    {hasDoc ? 'Document available' : 'Document required'}
                </p>
            </div>
        </div>
        {hasDoc && (
            <button
                onClick={onDownload}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label={`Download ${title}`}
            >
                <FiDownload size={16} />
            </button>
        )}
    </div>
);

export default Profile;