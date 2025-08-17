import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useAuth } from '../Components/AuthContext';
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiActivity,
  FiFileText,
  FiCreditCard,
  FiZap,
  FiBell,
  FiEye,
  FiTrendingUp,
  FiAlertCircle,
  FiBarChart,
} from 'react-icons/fi';

// Interfaces
interface ExtendedBill {
  billNo?: number;
  cusId: number;
  billDate: string;
  billMonth: string;
  billYear: number;
  previousReading: number;
  currentReading: number;
  minimumCharge: number;
  rate: number;
  consumedUnit?: number;
  totalBillAmount?: number;
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  status?: string;
  dueDate?: string;
  customer?: {
    cusId: number;
    name: string;
    address: string;
  };
  createdMonthNepali?: string;
  createdYearNepali?: number;
}

interface Customer {
  cusId: number;
  name: string;
  address: string;
}

interface UsageData {
  month: string;
  year: number;
  usage: number;
  amount: number;
  monthYear: string;
}

interface NepaliDate {
  year: number;
  month: string;
  day: number;
  formatted: string;
}

interface MonthlySummaryData {
  name: string;
  amount: number;
  displayName: string[];
}

const NEPALI_MONTHS = [
  'Baisakh (बैशाख)',
  'Jestha (जेठ)',
  'Ashadh (असार)',
  'Shrawan (साउन)',
  'Bhadra (भदौ)',
  'Ashwin (असोज)',
  'Kartik (कार्तिक)',
  'Mangsir (मंसिर)',
  'Poush (पुष)',
  'Magh (माघ)',
  'Falgun (फागुन)',
  'Chaitra (चैत)',
];

// Utility Components
const GradientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-r from-green-200 to-blue-200 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);

const ChartCard = ({
  title,
  children,
  className = '',
  icon: Icon,
  loading = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className={`relative bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-6 overflow-hidden hover:shadow-xl transition-shadow duration-300 ${className}`}
  >
    {loading && (
      <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )}
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        {Icon && <Icon className="mr-2 text-green-500 text-lg" />}
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const increment = Math.ceil(value / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        current = value;
        clearInterval(timer);
      }
      setDisplayValue(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// Custom Tick Component for Multi-line Labels
const CustomTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line: string, index: number) => (
        <text
          key={index}
          x={0}
          y={index * 14}
          dy={12}
          textAnchor="middle"
          fill="#4B5563"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

const CustomerDashboard = () => {
  const { isAuthenticated, customerId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<ExtendedBill[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allUsageData, setAllUsageData] = useState<UsageData[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showAllData, setShowAllData] = useState(false);
  const [today, setToday] = useState(new Date());
  const [paymentMethodData, setPaymentMethodData] = useState<{ name: string; transactions: number; amount: number }[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    currentBill: 0,
    currentBillMonth: '',
    currentBillYear: 0,
    dueDate: '',
    unpaidBills: 0,
    unpaidAmount: 0,
    totalUsage: 0,
    avgMonthlyBill: 0,
    usageTrend: 'stable' as 'up' | 'down' | 'stable',
    prevBillAmount: 0,
    prevMonth: '',
    prevYear: 0,
  });

  const mockNotifications = [
    'Your electricity bill for current month is now available',
    'Payment reminder: Bill due in 3 days',
    'Energy saving tip: Use LED bulbs to reduce consumption',
    'Scheduled maintenance on upcoming weekend',
    'New online payment methods now available',
  ];

  useEffect(() => {
    if (!isAuthenticated || !customerId) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('No auth token found. Please log in.');
          navigate('/login');
          return;
        }

        // Fetch current Nepali date
        const dateResponse = await fetch('http://localhost:5008/api/Bills/current-nepali-date', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (dateResponse.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!dateResponse.ok) {
          throw new Error('Failed to fetch Nepali date');
        }

        const nepaliDate: NepaliDate = await dateResponse.json();

        // Fetch customer bills
        const billsResponse = await fetch('http://localhost:5008/api/Bills/customer-bills-with-details', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (billsResponse.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!billsResponse.ok) {
          throw new Error('Failed to fetch customer bills');
        }

        const data = await billsResponse.json();
        setCustomer(data.customer || { name: 'Unknown', address: '', cusId: customerId });

        // Process bills
        const processedBills: ExtendedBill[] = data.bills.map((bill: ExtendedBill) => {
          const createdDate = bill.createdDate ? new Date(bill.createdDate) : new Date();
          const dueDate = new Date(createdDate);
          dueDate.setDate(dueDate.getDate() + 15);
          return {
            ...bill,
            dueDate: dueDate.toISOString(),
            consumedUnit: bill.consumedUnit || bill.currentReading - bill.previousReading,
            totalBillAmount: bill.totalBillAmount || bill.minimumCharge + (bill.currentReading - bill.previousReading) * bill.rate,
            customer: bill.customer || { cusId: bill.cusId, name: 'Unknown', address: '' },
            createdMonthNepali: bill.createdMonthNepali || nepaliDate.month || 'Baisakh',
            createdYearNepali: bill.createdYearNepali || nepaliDate.year || new Date().getFullYear() + 57,
          };
        });

        setBills(processedBills);

        // Process usage data
        const usageDataMap: Record<string, UsageData> = {};
        processedBills.forEach((bill: ExtendedBill) => {
          const month = bill.billMonth || bill.createdMonthNepali || 'Baisakh';
          const year = bill.billYear || bill.createdYearNepali || new Date().getFullYear() + 57;
          const key = `${month}-${year}`;
          if (!usageDataMap[key]) {
            usageDataMap[key] = {
              month,
              year,
              usage: bill.consumedUnit || 0,
              amount: bill.totalBillAmount || 0,
              monthYear: `${month.slice(0, 4)}\n${year}`,
            };
          } else {
            usageDataMap[key].usage += bill.consumedUnit || 0;
            usageDataMap[key].amount += bill.totalBillAmount || 0;
          }
        });

        const sortedUsageData = Object.values(usageDataMap).sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return NEPALI_MONTHS.indexOf(a.month) - NEPALI_MONTHS.indexOf(b.month);
        });

        setAllUsageData(sortedUsageData);

        // Calculate stats
        const unpaidBills = processedBills.filter(
          bill => ['unpaid', 'pending', 'overdue'].includes(bill.status?.toLowerCase() || '') || !bill.status,
        );

        const currentBill =
          processedBills.find(bill => bill.billMonth === nepaliDate.month && bill.billYear === nepaliDate.year) ||
          unpaidBills.sort((a, b) => {
            if (a.billYear !== b.billYear) return (b.billYear || 0) - (a.billYear || 0);
            return NEPALI_MONTHS.indexOf(b.billMonth || 'Baisakh') - NEPALI_MONTHS.indexOf(a.billMonth || 'Baisakh');
          })[0] ||
          processedBills.sort((a, b) => {
            if (a.billYear !== b.billYear) return (b.billYear || 0) - (a.billYear || 0);
            return NEPALI_MONTHS.indexOf(b.billMonth || 'Baisakh') - NEPALI_MONTHS.indexOf(a.billMonth || 'Baisakh');
          })[0];

        const currentYear = nepaliDate.year || new Date().getFullYear() + 57;
        const currentMonthIndex = NEPALI_MONTHS.indexOf(nepaliDate.month || 'Baisakh');
        const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
        const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
        const prevMonth = NEPALI_MONTHS[prevMonthIndex];
        const prevBill = processedBills.find((bill: ExtendedBill) => bill.billMonth === prevMonth && bill.billYear === prevYear) || {
          totalBillAmount: 0,
        };

        const usageTrend =
          sortedUsageData.length >= 2
            ? sortedUsageData[sortedUsageData.length - 1].amount > sortedUsageData[sortedUsageData.length - 2].amount * 1.1
              ? 'up'
              : sortedUsageData[sortedUsageData.length - 1].amount < sortedUsageData[sortedUsageData.length - 2].amount * 0.9
                ? 'down'
                : 'stable'
            : 'stable';

        setDashboardStats({
          currentBill: currentBill?.totalBillAmount || 0,
          currentBillMonth: currentBill?.billMonth || nepaliDate.month || 'Baisakh',
          currentBillYear: currentBill?.billYear || nepaliDate.year || new Date().getFullYear() + 57,
          dueDate: currentBill?.dueDate || '',
          unpaidBills: unpaidBills.length,
          unpaidAmount: unpaidBills.reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0),
          totalUsage: processedBills.reduce((sum, bill) => sum + (bill.consumedUnit || 0), 0),
          avgMonthlyBill: processedBills.length > 0 ? processedBills.reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0) / processedBills.length : 0,
          usageTrend,
          prevBillAmount: prevBill.totalBillAmount || 0,
          prevMonth,
          prevYear,
        });

        setNotifications(mockNotifications);

        // Fetch customer-specific payment methods
        const paymentMethodsResponse = await fetch(`http://localhost:5008/api/PaymentMethod/customer/${customerId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (paymentMethodsResponse.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!paymentMethodsResponse.ok) {
          throw new Error('Failed to fetch payment methods');
        }

        const paymentMethods = await paymentMethodsResponse.json();
        setPaymentMethodData(paymentMethods);

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, customerId, navigate]);

  // Update usageData based on showAllData
  useEffect(() => {
    const currentYear = dashboardStats.currentBillYear || new Date().getFullYear() + 57;
    setUsageData(showAllData ? allUsageData : allUsageData.filter(item => item.year >= currentYear - 1));
  }, [showAllData, allUsageData, dashboardStats.currentBillYear]);

  // Update today every hour
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(new Date());
    }, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => `रु. ${amount.toLocaleString()}`;

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string, today: Date) => {
    if (!dueDate) return 0;
    const diffTime = new Date(dueDate).getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <FiCheckCircle className="text-green-500" />;
      case 'unpaid':
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" />;
      default:
        return <FiFileText className="text-gray-500" />;
    }
  };

  const monthlySummaryData: MonthlySummaryData[] = usageData.map(item => {
    const [englishMonth] = item.month.split(' (');

    return {
      name: `${englishMonth} ${item.year}`,
      displayName: [englishMonth, item.year.toString()],
      amount: item.amount
    };
  });
  const averageAmount = Math.round(dashboardStats.avgMonthlyBill);

  const COLORS = ['#4CAF50', '#2563EB', '#FF9800', '#F44336', '#9C27B0', '#22C55E'];
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <GradientBackground />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-xl p-1 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative">
      <GradientBackground />
      <div className="relative z-10 p-3 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Welcome back, {customer?.name || 'Customer'}! Here's your electricity usage overview.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 md:mt-0 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-lg"
            onClick={() => navigate('/my-bills')}
          >
            <FiFileText className="text-sm" />
            <span>View All Bills</span>
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`relative bg-white/80 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 ${dashboardStats.unpaidBills > 0 ? (isOverdue(dashboardStats.dueDate) ? 'border-red-500' : 'border-yellow-500') : 'border-green-500'
              }`}
          >
            <div className="p-6 pb-16 flex flex-col justify-between h-full">
              <p className="text-sm text-gray-500 font-medium mb-1 tracking-wide">
                {dashboardStats.currentBillMonth} {dashboardStats.currentBillYear} Amount:
              </p>
              <motion.p
                className="text-2xl font-extrabold text-gray-800 flex items-center flex-wrap gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {bills.find(
                  bill => bill.billMonth === dashboardStats.currentBillMonth && bill.billYear === dashboardStats.currentBillYear,
                )?.status?.toLowerCase() === 'paid' ? (
                  <>
                    <span className="line-through text-gray-500">
                      रु. <AnimatedCounter value={dashboardStats.currentBill} />
                    </span>
                    <span className="flex items-center space-x-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      <FiCheckCircle className="text-green-500 text-sm" />
                      <span>Paid</span>
                    </span>
                  </>
                ) : (
                  <>
                    रु. <AnimatedCounter value={dashboardStats.currentBill} />
                  </>
                )}
              </motion.p>
              {dashboardStats.unpaidBills > 0 &&
                bills.find(
                  bill => bill.billMonth === dashboardStats.currentBillMonth && bill.billYear === dashboardStats.currentBillYear,
                )?.status?.toLowerCase() !== 'paid' && (
                  <motion.a
                    href="/billform"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-6 inline-flex w-fit items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold px-3 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 animate-bounce hover:animate-none"
                  >
                    <FiCreditCard className="text-xs" />
                    Pay Now
                  </motion.a>
                )}
            </div>
            <div
              className={`absolute bottom-4 right-4 p-4 rounded-full ${dashboardStats.unpaidBills > 0
                ? isOverdue(dashboardStats.dueDate)
                  ? 'bg-red-100 text-red-500'
                  : 'bg-yellow-100 text-yellow-500'
                : 'bg-green-100 text-green-500'
                }`}
            >
              <FiDollarSign className="text-2xl" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`relative bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-all duration-300 ${dashboardStats.unpaidBills > 0 ? (isOverdue(dashboardStats.dueDate) ? 'border-red-500' : 'border-yellow-500') : 'border-green-500'
              }`}
          >
            <div className="p-6 pb-16">
              <p className="text-sm font-medium text-gray-500 mb-1">Payment Status</p>
              <motion.p
                className="text-2xl font-bold text-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {dashboardStats.unpaidBills > 0 ? (
                  isOverdue(dashboardStats.dueDate) ? (
                    'Overdue'
                  ) : (
                    `${getDaysUntilDue(dashboardStats.dueDate, today)} Day${getDaysUntilDue(dashboardStats.dueDate, today) !== 1 ? 's' : ''} Left`
                  )
                ) : (
                  'All Bills Paid'
                )}
              </motion.p>
              <div className="flex items-center mt-3">
                {dashboardStats.unpaidBills > 0 ? (
                  isOverdue(dashboardStats.dueDate) ? (
                    <span className="text-xs font-medium text-red-600">PAYMENT OVERDUE</span>
                  ) : (
                    <span className="text-xs font-medium text-yellow-600">Payment pending</span>
                  )
                ) : (
                  <div className="flex items-center space-x-1">
                    <FiCheckCircle className="text-green-500" />
                    <span className="text-xs font-medium text-green-600">No outstanding bills</span>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`absolute bottom-4 right-4 p-4 rounded-full ${dashboardStats.unpaidBills > 0
                ? isOverdue(dashboardStats.dueDate)
                  ? 'bg-red-100 text-red-500'
                  : 'bg-yellow-100 text-yellow-500'
                : 'bg-green-100 text-green-500'
                }`}
            >
              {dashboardStats.unpaidBills > 0 ? (
                isOverdue(dashboardStats.dueDate) ? (
                  <FiAlertCircle className="text-2xl" />
                ) : (
                  <FiClock className="text-2xl" />
                )
              ) : (
                <FiCheckCircle className="text-2xl" />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6 pb-16">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Usage</p>
              <motion.p
                className="text-2xl font-bold text-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <AnimatedCounter value={dashboardStats.totalUsage} /> kWh
              </motion.p>
              <div className="flex items-center mt-3">
                <FiTrendingUp
                  className={`mr-2 ${dashboardStats.usageTrend === 'up'
                    ? 'text-red-500'
                    : dashboardStats.usageTrend === 'down'
                      ? 'text-green-500'
                      : 'text-blue-500'
                    }`}
                />
                <span
                  className={`text-xs font-medium ${dashboardStats.usageTrend === 'up'
                    ? 'text-red-600'
                    : dashboardStats.usageTrend === 'down'
                      ? 'text-green-600'
                      : 'text-blue-600'
                    }`}
                >
                  {dashboardStats.usageTrend === 'up'
                    ? 'Usage increasing'
                    : dashboardStats.usageTrend === 'down'
                      ? 'Usage decreasing'
                      : 'Usage stable'}
                </span>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 p-4 rounded-full bg-blue-100 text-blue-500">
              <FiZap className="text-2xl" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`relative bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-all duration-300 ${dashboardStats.unpaidBills > 0 ? 'border-orange-500' : 'border-green-500'
              }`}
          >
            <div className="p-6 pb-16">
              <p className="text-sm font-medium text-gray-500 mb-1">Unpaid Bills</p>
              <div className="space-y-1">
                <motion.p
                  className="text-2xl font-bold text-gray-800"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <AnimatedCounter value={dashboardStats.unpaidBills} /> Bills
                </motion.p>
                <motion.p
                  className="text-lg font-semibold text-orange-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  रु. <AnimatedCounter value={dashboardStats.unpaidAmount} />
                </motion.p>
              </div>
              <div className="flex items-center mt-3">
                {dashboardStats.unpaidBills > 0 ? (
                  <span className="text-xs font-medium text-orange-600">
                    {dashboardStats.unpaidBills === 1 ? 'One bill pending' : 'Multiple bills pending'}
                  </span>
                ) : (
                  <div className="flex items-center space-x-1">
                    <FiCheckCircle className="text-green-500" />
                    <span className="text-xs font-medium text-green-600">All bills cleared</span>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`absolute bottom-4 right-4 p-4 rounded-full ${dashboardStats.unpaidBills > 0 ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'
                }`}
            >
              <FiAlertTriangle className="text-2xl" />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <ChartCard title="Electricity Usage Trend" icon={FiBarChart} className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Showing: {showAllData ? 'All Data' : 'Last 2 Years'}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAllData(prev => !prev)}
                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors duration-200 flex items-center space-x-1"
              >
                <FiEye className="text-xs" />
                <span>{showAllData ? 'Show Recent' : 'Show All'}</span>
              </motion.button>
            </div>
            {usageData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <FiZap className="mx-auto mb-4 text-4xl text-gray-300" />
                <p>No usage data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="monthYear"
                    stroke="#4B5563"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    fontWeight="600"
                    interval={0}
                    height={60}
                    tick={CustomTick}
                  />
                  <YAxis
                    stroke="#4B5563"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={value => `${value} kWh`}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #E5E7EB',
                      color: '#1F2937',
                    }}
                    formatter={(value: number) => [`${value} kWh`, 'Usage']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#10B981"
                    strokeWidth={0}
                    fill="url(#colorUsage)"
                    name="Usage (kWh)"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Alerts & Notifications" icon={FiBell}>
            <div className="space-y-3 max-h-85 overflow-y-auto">
              {notifications.map((notification, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start space-x-2">
                    <FiBell className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{notification}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <ChartCard title="Monthly Bill Summary" icon={FiDollarSign} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthlySummaryData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="20%"
                barGap={0}
                layout="horizontal"
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
                  </linearGradient>
                  <filter id="shadow" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#9CA3AF" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickMargin={10}
                  height={50}
                  tick={(props: { x: number; y: number; payload: { value: string } }) => {
                    const { x, y, payload } = props;
                    const [month, year] = payload.value.split(' ');
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="middle"
                          fill="#374151"
                          fontSize={11}
                          fontWeight="600"
                        >
                          {month}
                        </text>
                        <text
                          x={0}
                          y={0}
                          dy={32}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize={10}
                          fontWeight="500"
                        >
                          {year}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  stroke="#4B5563"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `रु. ${value.toLocaleString()}`}
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #E5E7EB',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  formatter={(value: number) => [`रु. ${value.toLocaleString()}`, 'Amount']}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
                />
                <ReferenceLine
                  y={averageAmount}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Avg: रु. ${averageAmount.toLocaleString()}`,
                    position: "right",
                    style: { fill: '#EF4444', fontWeight: 'bold', fontSize: '12px' }
                  }}
                />
                <Bar
                  dataKey="amount"
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                >
                  {monthlySummaryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="url(#colorAmount)" />
                  ))}
                </Bar>
                <Bar
                  dataKey="amount"
                  fill="transparent"
                  label={{
                    position: 'top',
                    formatter: (label: React.ReactNode) => {
                      if (typeof label === 'number') {
                        return `रु. ${label.toLocaleString()}`;
                      }
                      return label;
                    },
                    style: {
                      fill: '#374151',
                      fontSize: 11,
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="My Payment Methods" icon={FiCreditCard}>
            {paymentMethodData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <FiCreditCard className="mx-auto mb-4 text-4xl text-gray-300" />
                  <p className="text-lg font-medium">No Payment Data</p>
                  <p className="text-sm">No payments made yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    dataKey="transactions"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={5}
                    label={(props) => {
                      const { name, percent } = props;
                      return `${name ?? ''}: ${percent !== undefined ? (percent * 100).toFixed(1) : '0'}%`;
                    }}
                  >
                    {paymentMethodData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: '0.5rem',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #E5E7EB',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'transactions') {
                        const methodData = paymentMethodData.find(method => method.transactions === value);
                        return [
                          `${value} payment${value !== 1 ? 's' : ''} (रु. ${methodData?.amount.toLocaleString() || 0})`,
                          'Payments'
                        ];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-10">
          <ChartCard title="Recent Bills" icon={FiFileText}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-gray-600 font-semibold">Month</th>
                    <th className="text-left py-3 text-gray-600 font-semibold">Bill No.</th>
                    <th className="text-left py-3 text-gray-600 font-semibold">Amount</th>
                    <th className="text-left py-3 text-gray-600 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills
                    .sort((a, b) => {
                      if (a.billYear !== b.billYear) return b.billYear - a.billYear;
                      return NEPALI_MONTHS.indexOf(b.billMonth || 'Baisakh') - NEPALI_MONTHS.indexOf(a.billMonth || 'Baisakh');
                    })
                    .slice(0, 5)
                    .map((bill, index) => (
                      <motion.tr
                        key={bill.billNo || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 cursor-${bill.status?.toLowerCase() === 'pending' ? 'pointer' : 'default'
                          }`}
                        onClick={() => {
                          if (bill.status?.toLowerCase() === 'pending') {
                            navigate('/billform', {
                              state: {
                                billNo: bill.billNo,
                                totalBillAmount: bill.totalBillAmount,
                                dueDate: bill.dueDate,
                                billMonth: bill.billMonth,
                                billYear: bill.billYear,
                                consumedUnit: bill.consumedUnit,
                                customer: bill.customer,
                              },
                            });
                          }
                        }}
                      >
                        <td className="py-3 font-medium text-gray-700">
                          {bill.billMonth} {bill.billYear}
                        </td>
                        <td className="py-3 text-gray-600">{bill.billNo || 'N/A'}</td>
                        <td className="py-3 font-semibold text-gray-800">{formatCurrency(bill.totalBillAmount || 0)}</td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(bill.status)}
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-medium ${bill.status?.toLowerCase() === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : bill.status?.toLowerCase() === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                              {bill.status || 'Pending'}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
              {bills.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiFileText className="mx-auto mb-4 text-4xl text-gray-300" />
                  <p>No bills available</p>
                </div>
              )}
              <div className="mt-6 text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/my-bills')}
                  className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center justify-center space-x-2 mx-auto bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                >
                  <FiEye className="text-sm" />
                  <span>View All Bills</span>
                </motion.button>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Quick Actions" icon={FiActivity}>
            <div className="grid grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-600 p-6 rounded-lg flex flex-col items-center transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={() => navigate('/my-bills')}
              >
                <FiFileText size={24} className="mb-3" />
                <span className="text-sm font-semibold">View Bills</span>
                <span className="text-xs text-green-500 mt-1">Check history</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 p-6 rounded-lg flex flex-col items-center transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={() => navigate('/billform')}
              >
                <FiCreditCard size={24} className="mb-3" />
                <span className="text-sm font-semibold">Pay Bill</span>
                <span className="text-xs text-blue-500 mt-1">Quick payment</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 p-6 rounded-lg flex flex-col items-center transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={() => navigate('/Profile')}
              >
                <FiActivity size={24} className="mb-3" />
                <span className="text-sm font-semibold">My Profile</span>
                <span className="text-xs text-purple-500 mt-1">Update info</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 p-6 rounded-lg flex flex-col items-center transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={() => navigate('/customer-support')}
              >
                <FiBell size={24} className="mb-3" />
                <span className="text-sm font-semibold">Support</span>
                <span className="text-xs text-orange-500 mt-1">Get help</span>
              </motion.button>
            </div>
          </ChartCard>
        </div>

        {dashboardStats.unpaidBills > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className={`mb-6 p-6 rounded-xl shadow-lg ${isOverdue(dashboardStats.dueDate)
              ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
              : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-full ${isOverdue(dashboardStats.dueDate) ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-500'}`}
                >
                  {isOverdue(dashboardStats.dueDate) ? <FiAlertCircle size={24} /> : <FiClock size={24} />}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isOverdue(dashboardStats.dueDate) ? 'text-red-800' : 'text-yellow-800'}`}>
                    {isOverdue(dashboardStats.dueDate) ? 'Payment Overdue!' : 'Payment Reminder'}
                  </h3>
                  <p className={`text-sm ${isOverdue(dashboardStats.dueDate) ? 'text-red-600' : 'text-yellow-600'}`}>
                    You have {dashboardStats.unpaidBills} unpaid bill{dashboardStats.unpaidBills > 1 ? 's' : ''} totaling रु.{' '}
                    {dashboardStats.unpaidAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/billform')}
                className={`px-6 py-3 rounded-lg font-semibold ${isOverdue(dashboardStats.dueDate) ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
              >
                Pay Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;