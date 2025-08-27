import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, X, Clock, Loader } from 'lucide-react';
import { getAuthToken, isCustomer } from '../utility/auth';

interface KhaltiLookupResponse {
    pidx: string;
    total_amount: number;
    status: string;
    transaction_id?: string;
    fee: number;
    refunded: boolean;
}

const PaymentCallbackPage = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
    const [paymentDetails, setPaymentDetails] = useState<any>(null);
    const [verificationResult, setVerificationResult] = useState<KhaltiLookupResponse | null>(null);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const pidx = searchParams.get('pidx');
    const transactionId = searchParams.get('transaction_id');
    const amount = searchParams.get('amount');
    const paymentStatus = searchParams.get('status');
    const purchaseOrderId = searchParams.get('purchase_order_id');
    const token = getAuthToken();

    useEffect(() => {
        if (!pidx) {
            setStatus('failed');
            setToastMessage('Invalid payment callback: Missing pidx');
            return;
        }

        // Retrieve stored payment details from sessionStorage
        const storedDetails = sessionStorage.getItem('khalti_payment_details');
        if (storedDetails) {
            setPaymentDetails(JSON.parse(storedDetails));
        } else {
            setStatus('failed');
            setToastMessage('No payment details found');
            return;
        }

        handlePaymentCallback();
    }, [pidx]);

    const handlePaymentCallback = async () => {
        try {
            if (paymentStatus === 'User canceled') {
                setStatus('cancelled');
                setToastMessage('Payment was cancelled by user');
                return;
            }

            // Make API call to verify payment
            const response = await fetch(
                `http://localhost:5008/api/Khalti/handle-callback?pidx=${pidx}&status=${paymentStatus}&transaction_id=${transactionId}&amount=${amount}&purchase_order_id=${purchaseOrderId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const result = await response.json();
            console.log('Callback Response:', result);

            if (response.ok && result.success) {
                setVerificationResult({
                    pidx: pidx || '',
                    total_amount: parseInt(amount || '0'),
                    status: paymentStatus || 'Completed',
                    transaction_id: transactionId || '',
                    fee: result.fee || 0,
                    refunded: result.refunded || false,
                });
                setStatus('success');
                setToastMessage('Payment completed successfully!');

                // Redirect to customer dashboard after 3 seconds if user is a customer
                if (isCustomer()) {
                    setTimeout(() => {
                        setToastMessage('Redirecting to dashboard...');
                        navigate('/customer-dashboard');
                    }, 3000);
                }
            } else {
                setStatus('failed');
                setToastMessage(result.message || 'Payment verification failed');
            }
        } catch (error) {
            console.error('Payment callback error:', error);
            setStatus('failed');
            setToastMessage('Failed to verify payment');
        }
    };

    const handleReturnToDashboard = () => {
        setToastMessage('Returning to dashboard...');
        if (isCustomer()) {
            navigate('/customer-dashboard');
        } else {
            navigate('/'); // Fallback for non-customers (e.g., redirect to home)
        }
    };

    const handleRetryPayment = () => {
        setToastMessage('Redirecting to payment...');
        navigate('/BillForm'); // Adjust to your payment page route
    };

    const renderStatusContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="text-center">
                        <Loader className="mx-auto h-16 w-16 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
                        <p className="text-gray-600">Please wait while we verify your payment...</p>
                    </div>
                );

            case 'success':
                return (
                    <div className="text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>

                        {verificationResult && (
                            <div className="bg-green-50 rounded-lg p-4 mb-6 shadow-md">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 font-medium">Transaction ID:</span>
                                        <span className="font-mono font-medium text-gray-800">{verificationResult.transaction_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 font-medium">Amount Paid:</span>
                                        <span className="font-medium text-green-700">
                                            रु. {(verificationResult.total_amount / 100).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        <span className="font-medium text-green-700">{verificationResult.status}</span>
                                    </div>
                                    {paymentDetails && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 font-medium">Bill Number:</span>
                                            <span className="font-medium text-gray-800">{paymentDetails.billNo}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-gray-500 mb-4">
                            {isCustomer() ? 'Redirecting to dashboard in 3 seconds...' : 'Please return to dashboard manually.'}
                        </div>

                        <button
                            onClick={handleReturnToDashboard}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                );

            case 'cancelled':
                return (
                    <div className="text-center">
                        <Clock className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                        <h2 className="text-2xl font-bold text-yellow-700 mb-2">Payment Cancelled</h2>
                        <p className="text-gray-600 mb-6">You cancelled the payment process.</p>

                        <div className="space-x-4">
                            <button
                                onClick={handleRetryPayment}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleReturnToDashboard}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                );

            case 'failed':
            default:
                return (
                    <div className="text-center">
                        <X className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
                        <p className="text-gray-600 mb-6">
                            Unfortunately, your payment could not be processed. Please try again.
                        </p>

                        <div className="space-x-4">
                            <button
                                onClick={handleRetryPayment}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleReturnToDashboard}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-[1.02] duration-300">
                <div className="p-8">
                    {renderStatusContent()}

                    {/* Toast Message Display */}
                    {toastMessage && (
                        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm animate-fade-in">
                            <p className="text-blue-800 text-sm text-center font-medium">{toastMessage}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentCallbackPage;