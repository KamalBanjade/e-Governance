import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiCreditCard, FiFileText, FiCheckCircle, FiChevronDown, FiDollarSign, FiCalendar, FiHash } from 'react-icons/fi';
import { getAuthToken } from '../utility/auth';
import type { Bill, Customer } from '../types/models';

interface ExtendedBill extends Bill {
    customer?: Customer;
}

interface BillsResponse {
    customer: Customer;
    bills: ExtendedBill[];
}

interface PaymentMethod {
    paymentMethodId: number;
    name: string;
}

const PaymentPage = () => {
    const token = getAuthToken();
    const navigate = useNavigate();
    const location = useLocation();

    const [, setCustomer] = useState<Customer | null>(null);
    const [bills, setBills] = useState<ExtendedBill[]>([]);
    const [selectedBill, setSelectedBill] = useState<ExtendedBill | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);

    const passedBill = location.state?.bill;
    const passedCustomer = location.state?.customer;
    const passedPayment = location.state?.payment;

    useEffect(() => {
        if (passedBill && passedCustomer) {
            setSelectedBill(passedBill);
            setCustomer(passedCustomer);
            setBills([passedBill]);
        } else {
            fetchCustomerBills();
        }
    }, []);

    useEffect(() => {
        fetch('http://localhost:5008/api/PaymentMethod')
            .then(res => res.json())
            .then(data => setPaymentMethods(data))
            .catch(err => console.error('Failed to fetch payment methods:', err));
    }, []);

    const fetchCustomerBills = async () => {
        if (!token) {
            toast.error('Session expired. Please login.', { position: 'top-center' });
            navigate('/login');
            return;
        }

        try {
            const response = await fetch('http://localhost:5008/api/Bills/customer-bills-with-details', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch bills');

            const data: BillsResponse = await response.json();
            setCustomer(data.customer);
            setBills(data.bills);
            if (data.bills.length > 0) {
                setSelectedBill(data.bills[0]);
            }
        } catch (error) {
            toast.error('Could not load bills.', { position: 'top-center' });
            console.error(error);
        }
    };

    const handleBillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const billNo = parseInt(e.target.value);
        const bill = bills.find(b => b.billNo === billNo);
        if (bill) setSelectedBill(bill);
    };

    // const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     const paymentMethodId = parseInt(e.target.value);
    //     setSelectedPaymentMethod(paymentMethodId);
    // };

    const handlePayment = async () => {
        if (!selectedBill || !selectedPaymentMethod) {
            toast.error('Please select a bill and payment method.', { position: 'top-center' });
            return;
        }

        setLoading(true);
        try {
            const paymentData = {
                billNo: selectedBill.billNo,
                paymentMethodId: selectedPaymentMethod,
                paymentDate: new Date().toISOString(),
                transactionId: `TX${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
            };

            const response = await fetch('http://localhost:5008/api/Payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) throw new Error('Payment failed. Please try again.');

            toast.success(
                `Payment of $${selectedBill.totalBillAmount?.toFixed(2)} successful!`,
                { position: 'top-center', icon: <FiCheckCircle className="text-green-500" /> }
            );
            navigate('/paymentgateway');

        } catch (error) {
            toast.error('Payment failed.', { position: 'top-center' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-gradient-to-tr from-blue-300 to-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-3xl">
                    {/* Header - Now with gradient background */}
                    <div className="bg-gradient-to-tr from-blue-200 to-white p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <FiCreditCard className="text-3xl text-blue-600" />
                                <h2 className="text-2xl font-bold text-gray-800">Payment Portal</h2>
                            </div>
                            {passedCustomer && (
                                <div className="bg-white/80 backdrop-blur-sm text-blue-800 rounded-full px-4 py-1 text-sm font-medium shadow-sm">
                                    {passedCustomer.name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6 space-y-6">
                        {/* Bill Selection */}
                        <div className="space-y-2">
                            <label className="block text-gray-700 font-medium">Select Bill</label>
                            <div className="relative">
                                <select
                                    value={selectedBill?.billNo || ''}
                                    onChange={handleBillChange}
                                    className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white shadow-sm"
                                >
                                    <option value="">-- Choose a bill --</option>
                                    {bills.map(bill => (
                                        <option key={bill.billNo} value={bill.billNo}>
                                            {bill.billMonth} {bill.billYear} - ${bill.totalBillAmount?.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            </div>
                        </div>

                        {/* Bill Details */}
                        {selectedBill && passedPayment && (
                            <div className="bg-gradient-to-tr from-blue-200 to-white rounded-xl p-5 border border-blue-100 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-lg text-gray-800 flex items-center">
                                        <FiFileText className="mr-2 text-blue-600" />
                                        Invoice Summary
                                    </h3>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        #{selectedBill.billNo}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Period:</span>
                                        <span className="font-medium">
                                            {selectedBill.billMonth} {selectedBill.billYear}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Original Amount:</span>
                                        <span className="font-medium">
                                            ${selectedBill.totalBillAmount?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Rebate:</span>
                                        <span>-${passedPayment.rebateAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Penalty:</span>
                                        <span>+${passedPayment.penaltyAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 mt-2">
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total Due:</span>
                                            <span className="text-blue-600">
                                                ${passedPayment.totalAmountPaid.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Date and Transaction ID */}
                                    {passedPayment.paymentDate && (
                                        <div className="flex justify-between text-sm text-gray-500 mt-3">
                                            <span className="flex items-center">
                                                <FiCalendar className="mr-1" />
                                                Payment Date:
                                            </span>
                                            <span>
                                                {new Date(passedPayment.paymentDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {passedPayment.transactionId && (
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span className="flex items-center">
                                                <FiHash className="mr-1" />
                                                Transaction ID:
                                            </span>
                                            <span className="font-mono">
                                                {passedPayment.transactionId}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <label className="block text-gray-700 font-medium">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                {paymentMethods.map(pm => (
                                    <button
                                        key={pm.paymentMethodId}
                                        onClick={() => setSelectedPaymentMethod(pm.paymentMethodId)}
                                        className={`p-3 rounded-lg border-2 transition-all relative overflow-hidden ${selectedPaymentMethod === pm.paymentMethodId
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <FiCreditCard className={
                                                selectedPaymentMethod === pm.paymentMethodId
                                                    ? 'text-blue-600'
                                                    : 'text-gray-500'
                                            } />
                                            <span className={
                                                selectedPaymentMethod === pm.paymentMethodId
                                                    ? 'font-medium text-blue-700'
                                                    : 'text-gray-700'
                                            }>
                                                {pm.name}
                                            </span>
                                        </div>
                                        {selectedPaymentMethod === pm.paymentMethodId && (
                                            <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                                                <FiCheckCircle className="text-white text-xs" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Button */}
                        <button
                            disabled={!selectedBill || !selectedPaymentMethod || loading}
                            onClick={handlePayment}
                            className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center space-x-2 ${!selectedBill || !selectedPaymentMethod || loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Processing Payment...
                                </>
                            ) : (
                                <>
                                    <FiDollarSign />
                                    <span>Pay Now</span>
                                </>
                            )}
                        </button>

                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentPage;