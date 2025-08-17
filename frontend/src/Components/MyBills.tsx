import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiUser, FiCalendar, FiZap, FiDollarSign, FiAlertCircle, FiChevronRight, FiLoader, FiCreditCard } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Bill, Customer } from '../types/models';
import { getAuthToken } from '../utility/auth';
import { useDialog } from '../Contexts/DialogContext';
import { useAuth } from '../Components/AuthContext';
import { motion } from 'framer-motion';

interface ExtendedBill extends Bill {
    billNo?: number;
    consumedUnit?: number;
    totalBillAmount?: number;
    createdDate?: string;
    createdBy?: string;
    updatedDate?: string;
    updatedBy?: string;
    status?: string;
}


const MyBills = () => {
    const { isAuthenticated, customerId, userRole, userTypeId } = useAuth();
    const token = getAuthToken();
    const navigate = useNavigate();
    const { confirm } = useDialog();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [bills, setBills] = useState<ExtendedBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    const isCustomer = () => {
        return userRole.toLowerCase() === 'customer' || userTypeId === '3';
    };

    useEffect(() => {
        if (!isAuthenticated || !token) {
            confirm(
                'Authentication Required',
                'You need to login to access this page.',
                () => navigate('/login'),
                { type: 'danger', confirmText: 'Login', showCancel: false }
            );
            setAuthChecked(true);
            return;
        }

        if (!isCustomer()) {
            toast.error('You are not authorized to view this page.');
            navigate('/dashboard');
            setAuthChecked(true);
            return;
        }

        if (customerId || isCustomer()) {
            fetchCustomerBillsWithDetails();
        } else {
            toast.error('Customer ID not found.');
            navigate('/dashboard');
        }

        setAuthChecked(true);
    }, [isAuthenticated, customerId, userRole, userTypeId, token, navigate, confirm]);

    const fetchCustomerBillsWithDetails = async () => {
        try {
            setLoading(true);
            console.log('Fetching bills for customer...');

            const url = `http://localhost:5008/api/Bills/customer-bills-with-details`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                console.error('Session expired - redirecting to login');
                toast.error('Session expired. Please log in again.');
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response Data:', data);

            if (!data.customer || !Array.isArray(data.bills)) {
                console.error('Invalid data structure received from API');
                throw new Error('Invalid data structure received from API');
            }

            const validatedBills = data.bills.map((bill: any) => {
                return {
                    billNo: bill.billNo,
                    billDate: bill.billDate,
                    billMonth: bill.billMonth,
                    billYear: bill.billYear,
                    consumedUnit: bill.consumedUnit,
                    totalBillAmount: bill.totalBillAmount,
                    status: bill.status,
                    cusId: bill.cusId,
                    previousReading: bill.previousReading,
                    currentReading: bill.currentReading,
                    minimumCharge: bill.minimumCharge,
                    rate: bill.rate,
                    dueDate: bill.dueDate
                };
            }).filter(Boolean);

            setBills(validatedBills);
            setCustomer(data.customer);

        } catch (err) {
            console.error('Failed to load bills:', err);
            toast.error('Failed to load your bills. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayBill = (bill: ExtendedBill) => {
        if (bill.status?.toLowerCase() === 'paid') {
            toast.info('This bill has already been paid.');
            return;
        }

        navigate('/BillForm', {
            state: {
                bill: {
                    billNo: bill.billNo,
                    cusId: bill.cusId,
                    billDate: bill.billDate,
                    billMonth: bill.billMonth,
                    billYear: bill.billYear,
                    previousReading: bill.previousReading,
                    currentReading: bill.currentReading,
                    minimumCharge: bill.minimumCharge,
                    rate: bill.rate,
                    consumedUnit: bill.consumedUnit,
                    totalBillAmount: bill.totalBillAmount,
                    status: bill.status || 'Pending',
                },
                customer: {
                    cusId: bill.cusId,
                    name: customer?.name || 'N/A',
                    address: customer?.address || 'N/A',
                },
            },
        });
    };


    if (!authChecked) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center"
                >
                    <FiLoader className="animate-spin h-12 w-12 text-green-600 mb-4" />
                    <p className="text-lg text-gray-600">Loading your bills...</p>
                    <p className="text-sm text-gray-500 mt-2">We're fetching your latest billing information</p>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer position="bottom-right" autoClose={3000} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center">
                        <FiFileText className="mr-3 h-9 w-9 text-blue-600" />
                        My Bills
                    </h1>
                    <p className="text-gray-600 mt-2">View and manage your electricity bills</p>
                </div>

                {/* Customer Information */}
                {customer && (
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="mb-8 p-6 bg-white rounded-xl shadow-md border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiUser className="h-6 w-6 text-indigo-600 mr-2" />
                                Customer Details
                            </h3>
                            <button
                                onClick={() => navigate('/Profile')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                            >
                                View Profile <FiChevronRight className="ml-1" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium text-gray-800">{customer.name}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Address</p>
                                <p className="font-medium text-gray-800">{customer.address}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Customer ID</p>
                                <p className="font-medium text-gray-800">{customer.cusId}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Bills Section */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-800">Bill History</h3>
                            <button
                                onClick={fetchCustomerBillsWithDetails}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {bills.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="p-4 font-semibold text-gray-700">Bill No</th>
                                        <th className="p-4 font-semibold text-gray-700">Date</th>
                                        <th className="p-4 font-semibold text-gray-700">Month</th>
                                        <th className="p-4 font-semibold text-gray-700">Year</th>
                                        <th className="p-4 font-semibold text-gray-700">Amount (₹)</th>
                                        <th className="p-4 font-semibold text-gray-700">Units</th>
                                        <th className="p-4 font-semibold text-gray-700">Status</th>
                                        <th className="p-4 font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.map((bill, index) => (
                                        <motion.tr
                                            key={bill.billNo}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="p-4 text-gray-700 font-medium">{bill.billNo}</td>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <FiCalendar className="h-4 w-4 text-gray-500 mr-2" />
                                                    {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-US') : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">{bill.billMonth || '-'}</td>
                                            <td className="p-4 text-gray-600">{bill.billYear || '-'}</td>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <FiDollarSign className="h-4 w-4 text-green-600 mr-2" />
                                                    <span className="font-medium">
                                                        {typeof bill.totalBillAmount === 'number' ? bill.totalBillAmount.toFixed(2) : '0.00'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <FiZap className="h-4 w-4 text-orange-500 mr-2" />
                                                    {typeof bill.consumedUnit === 'number' ? bill.consumedUnit.toFixed(2) : '0.00'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                                                        ${bill.status?.toLowerCase() === 'paid' ?
                                                        'bg-green-100 text-green-800' :
                                                        bill.status?.toLowerCase() === 'pending' ?
                                                            'bg-yellow-100 text-yellow-800' :
                                                            bill.status?.toLowerCase() === 'overdue' ?
                                                                'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                    {bill.status || 'Unpaid'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center space-x-2">
                                                    {/* Pay Bill Button */}
                                                    <button
                                                        onClick={() => handlePayBill(bill)}
                                                        disabled={bill.status?.toLowerCase() === 'paid'}
                                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center ${bill.status?.toLowerCase() === 'paid'
                                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                : bill.status?.toLowerCase() === 'overdue'
                                                                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                            } shadow-sm hover:shadow-md`}
                                                        title={bill.status?.toLowerCase() === 'paid' ? 'Bill Already Paid' : 'Pay Bill'}
                                                    >
                                                        <FiCreditCard className="mr-1" size={12} />
                                                        {bill.status?.toLowerCase() === 'paid'
                                                            ? 'Paid'
                                                            : bill.status?.toLowerCase() === 'overdue'
                                                                ? 'Pay Overdue'
                                                                : 'Pay Now'}
                                                    </button>


                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center p-12 text-center"
                        >
                            <FiAlertCircle className="h-16 w-16 text-gray-300 mb-4" />
                            <h4 className="text-xl font-medium text-gray-600 mb-2">No bills found</h4>
                            <p className="text-gray-500 max-w-md">
                                You don't have any bills yet. Bills will appear here once they're generated for your account.
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Summary Cards */}
                {bills.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8"
                    >
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-100">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Total Bills</h4>
                            <p className="text-3xl font-bold text-blue-600">{bills.length}</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-100">
                            <h4 className="text-sm font-medium text-green-800 mb-2">Total Amount</h4>
                            <p className="text-3xl font-bold text-green-600">
                                ₹{bills.reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-100">
                            <h4 className="text-sm font-medium text-purple-800 mb-2">Avg. Consumption</h4>
                            <p className="text-3xl font-bold text-purple-600">
                                {bills.length > 0
                                    ? (bills.reduce((sum, bill) => sum + (bill.consumedUnit || 0), 0) / bills.length).toFixed(2)
                                    : '0.00'} units
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-100">
                            <h4 className="text-sm font-medium text-red-800 mb-2">Pending Bills</h4>
                            <p className="text-3xl font-bold text-red-600">
                                {bills.filter(bill => bill.status?.toLowerCase() !== 'paid').length}
                            </p>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </>
    );
};

export default MyBills;