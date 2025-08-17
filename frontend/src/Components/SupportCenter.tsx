import { useState } from 'react';
import {
    Search,
    CreditCard,
    Calendar,
    FileText,
    Receipt,
    Lock,
    Settings,
    Mail,
    Phone,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    User,
    Shield,
    Smartphone
} from 'lucide-react';
import {ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';

const SupportCenter = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [showPhonePopup, setShowPhonePopup] = useState(false);

    const popularTopics = [
        { icon: CreditCard, title: "How to Pay Your Bill", description: "Learn about payment methods and process", color: "bg-green-100 text-green-700" },
        { icon: Calendar, title: "Understanding Due Dates and Penalties", description: "Important dates and fee information", color: "bg-blue-100 text-blue-700" },
        { icon: FileText, title: "How to Download Previous Bills", description: "Access your billing history", color: "bg-green-100 text-green-700" },
        { icon: Receipt, title: "Rebate and Fine Policies", description: "Understanding charges and refunds", color: "bg-blue-100 text-blue-700" },
        { icon: Lock, title: "Resetting Your Password", description: "Secure account access recovery", color: "bg-green-100 text-green-700" },
        { icon: Settings, title: "Changing Your Email or Contact Info", description: "Update your account details", color: "bg-blue-100 text-blue-700" }
    ];

    const faqData = {
        billing: [
            {
                question: "How do I pay my bill online?",
                answer: "You can pay your bill by logging into your account, selecting 'Pay Bill', choosing your payment method (credit card, debit card, or bank transfer), and confirming the payment amount."
            },
            {
                question: "What payment methods do you accept?",
                answer: "We accept major credit cards (Visa, MasterCard, American Express), debit cards, bank transfers, and mobile wallet payments."
            },
            {
                question: "When is my payment due?",
                answer: "Your payment due date is shown on your bill and in your account dashboard. Typically, bills are due 30 days from the billing date."
            },
            {
                question: "Are there any late payment fees?",
                answer: "Yes, a late fee of 2% of the outstanding amount or रु. 500 (whichever is higher) will be charged if payment is not received by the due date."
            }
        ],
        account: [
            {
                question: "How do I reset my password?",
                answer: "Click 'Forgot Password' on the login page, enter your email address, and follow the instructions sent to your email to create a new password."
            },
            {
                question: "How can I update my contact information?",
                answer: "Log into your account, go to 'Profile Settings', and update your email, phone number, or address as needed."
            },
            {
                question: "Can I change my billing address?",
                answer: "Yes, you can update your billing address in the 'Profile Settings' section of your account. Changes will take effect on your next billing cycle."
            }
        ],
        mobile: [
            {
                question: "Is there a mobile app available?",
                answer: "Yes, our mobile app is available for both iOS and Android devices. Search for 'NEA BillPay' in your app store."
            },
            {
                question: "Can I pay bills through the mobile app?",
                answer: "Absolutely! The mobile app offers full payment functionality, bill viewing, and account management features."
            }
        ],
        security: [
            {
                question: "Is my payment information secure?",
                answer: "Yes, we use bank-level encryption and security measures to protect your payment information. We never store your full credit card details."
            },
            {
                question: "How do you protect my personal data?",
                answer: "We follow strict data protection protocols, use encrypted connections, and comply with industry security standards to safeguard your information."
            }
        ]
    };

    const searchSuggestions = [
        "payment failed",
        "how to view bill",
        "change password",
        "late fees",
        "payment methods",
        "download receipt",
        "account locked",
        "update email"
    ];

    const filteredSuggestions = searchSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0
    );

    const toggleFAQ = (id: string) => {
        setExpandedFAQ(expandedFAQ === id ? null : id);
    };

    const getFAQsByFilter = () => {
        if (activeFilter === 'all') {
            return Object.entries(faqData).flatMap(([category, faqs]) =>
                faqs.map(faq => ({ ...faq, category }))
            );
        }
        return faqData[activeFilter as keyof typeof faqData]?.map(faq => ({ ...faq, category: activeFilter })) || [];
    };

    return (
        <>
            <ToastContainer position="bottom-right" autoClose={3000} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50"
            >
                <div className="max-w-6xl mx-auto px-4 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">
                            Support Center
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Get quick answers to your questions or reach out to our support team for personalized assistance
                        </p>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-12"
                    >
                        <div className="relative max-w-2xl mx-auto">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search for help... (e.g., 'payment failed', 'how to view bill')"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors shadow-lg"
                                />
                            </div>

                            {/* Search Suggestions */}
                            {filteredSuggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-2 shadow-lg z-10"
                                >
                                    {filteredSuggestions.map((suggestion, index) => (
                                        <motion.button
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSearchQuery(suggestion)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                        >
                                            <Search className="inline w-4 h-4 mr-2 text-gray-400" />
                                            {suggestion}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>

                    {/* Popular Help Topics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mb-12"
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                            Popular Help Topics
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {popularTopics.map((topic, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.01, translateY: -4 }}
                                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                                >
                                    <div className={`w-12 h-12 rounded-lg ${topic.color} flex items-center justify-center mb-4`}>
                                        <topic.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        {topic.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        {topic.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* FAQ Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mb-12"
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                            Frequently Asked Questions
                        </h2>

                        {/* FAQ Filter Buttons */}
                        <div className="flex flex-wrap justify-center gap-3 mb-8">
                            {[
                                { key: 'all', label: 'All', icon: HelpCircle },
                                { key: 'billing', label: 'Billing & Payments', icon: CreditCard },
                                { key: 'account', label: 'Account & Login', icon: User },
                                { key: 'mobile', label: 'Mobile App', icon: Smartphone },
                                { key: 'security', label: 'Security & Privacy', icon: Shield }
                            ].map((filter, index) => (
                                <motion.button
                                    key={filter.key}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => setActiveFilter(filter.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${activeFilter === filter.key
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 shadow-md'
                                    }`}
                                >
                                    <filter.icon className="w-4 h-4" />
                                    {filter.label}
                                </motion.button>
                            ))}
                        </div>

                        {/* FAQ Items */}
                        <div className="max-w-4xl mx-auto space-y-4">
                            {getFAQsByFilter().map((faq, index) => {
                                const faqId = `${faq.category}-${index}`;
                                return (
                                    <motion.div
                                        key={faqId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.01 }}
                                        className="bg-white rounded-lg shadow-md border border-gray-100"
                                    >
                                        <button
                                            onClick={() => toggleFAQ(faqId)}
                                            className="w-full text-left p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="font-semibold text-gray-800 pr-4">
                                                {faq.question}
                                            </span>
                                            {expandedFAQ === faqId ? (
                                                <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                            )}
                                        </button>

                                        {expandedFAQ === faqId && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                transition={{ duration: 0.3 }}
                                                className="px-6 pb-6"
                                            >
                                                <div className="border-t border-gray-100 pt-4">
                                                    <p className="text-gray-600 leading-relaxed">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Contact Support */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
                            <p className="text-green-100 text-lg">
                                Our support team is here to assist you with any questions or concerns
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <motion.div
                                whileHover={{ scale: 1.01, translateY: -4 }}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-all duration-300"
                            >
                                <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Email Support</h3>
                                <p className="text-green-100 mb-4 text-sm">
                                    Send us a detailed message
                                </p>
                                <a
                                    href="mailto:support@nea.org.np?subject=Support Request - Bill Payment System&body=Hello Support Team,%0D%0A%0D%0AI need assistance with:%0D%0A%0D%0APlease describe your issue here...%0D%0A%0D%0AThank you!"
                                    className="inline-block bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-blue-50 transition-colors"
                                >
                                    Send Email
                                </a>
                                <p className="text-xs text-green-100 mt-2">info@nea.org.np</p>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.01, translateY: -4 }}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-all duration-300"
                            >
                                <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Phone className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Phone Support</h3>
                                <p className="text-green-100 mb-4 text-sm">
                                    Speak directly with our team
                                </p>
                                <button
                                    onClick={() => setShowPhonePopup(true)}
                                    className="bg-white text-green-600 px-6 py-2 rounded-full font-semibold hover:bg-green-50 transition-colors"
                                >
                                    Call Now
                                </button>
                                <p className="text-xs text-green-100 mt-2">Mon-Fri: 9AM-6PM</p>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Phone Popup Modal */}
                    {showPhonePopup && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-green-500"
                            >
                                <div className="text-center">
                                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Phone className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Call Support</h3>
                                    <p className="text-gray-600 mb-6">Ready to connect with our support team?</p>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                        <p className="text-sm text-gray-600 mb-2">Call us at:</p>
                                        <a
                                            href="tel:+977-1-4153051"
                                            className="text-2xl font-bold text-green-600 hover:text-green-700 transition-colors"
                                        >
                                            977-1-4153051
                                        </a>
                                    </div>

                                    <div className="text-sm text-gray-500 mb-6">
                                        <p className="font-semibold">Business Hours:</p>
                                        <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                                        <p>Saturday: Closed</p>
                                    </div>

                                    <div className="flex gap-3">
                                        <a
                                            href="tel:+977-1-4153051"
                                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Call Now
                                        </a>
                                        <button
                                            onClick={() => setShowPhonePopup(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </>
    );
};

export default SupportCenter;