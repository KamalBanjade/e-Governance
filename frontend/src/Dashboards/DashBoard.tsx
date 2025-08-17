import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine,
  BarChart, Bar,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  AreaChart, Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useAuth } from '../Components/AuthContext';
import { FiTrendingUp, FiUsers, FiDollarSign, FiClock, FiActivity, FiPieChart, FiBarChart2 } from 'react-icons/fi';

// Define interfaces
interface Customer {
  id: number;
  createdAt: string;
  status: string;
  demandType: string | { name: string };
  registrationMonth: string;
  registrationYear: number;
}

interface Bill {
  billNo: number;
  cusId: number;
  billDate: string;
  billMonth: string;
  billYear: number;
  previousReading: number;
  currentReading: number;
  consumedUnit: number;
  minimumCharge: number;
  rate: number;
  totalBillAmount: number;
  status: string;
  createdDate: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
}

interface Employee {
  id: string;
  branchId: string;
}

interface Branch {
  branchId: string;
  name: string;
}

interface Payment {
  paymentId: number;
  billNo: number;
  paymentMethodId: number;
  cusId?: number;
  totalAmountPaid: number;
  rebateAmount: number;
  penaltyAmount: number;
  paymentDate: string;
  transactionId: string;
  paymentMethod?: string | { name: string };
  bill?: {
    billNo: number;
    cusId: number;
    billDate: string;
    totalBillAmount: number;
  };
  paymentMonthNepali?: string;
  paymentYearNepali?: number;
  paymentDayNepali?: number;
  paymentDateNepali?: string;
  paymentDateNepaliFormatted?: string;
}

interface DemandType {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface ExtendedBill extends Bill {
  customerName?: string;
  customerAddress?: string;
  customer?: {
    cusId: number;
    name: string;
    address: string;
  };
  createdDateNepali?: string;
  createdMonthNepali?: string;
  createdYearNepali?: number;
  createdDayNepali?: number;
  createdDateNepaliFormatted?: string;
  updatedDateNepali?: string;
  updatedMonthNepali?: string;
  updatedYearNepali?: number;
  updatedDayNepali?: number;
  updatedDateNepaliFormatted?: string;
}

interface CustomerAcquisitionData {
  Month: string;
  Year: number;
  NewCustomers: number;
  MonthYear: string;
}

interface RevenueData {
  month: string;
  year: number;
  revenue: number;
}

const NEPALI_MONTHS = [
  'Baisakh (बैशाख)', 'Jestha (जेठ)', 'Ashadh (असार)', 'Shrawan (साउन)',
  'Bhadra (भदौ)', 'Ashwin (असोज)', 'Kartik (कार्तिक)', 'Mangsir (मंसिर)',
  'Poush (पुष)', 'Magh (माघ)', 'Falgun (फागुन)', 'Chaitra (चैत)'
];

// Helper function to calculate customer change percentage
const calculateCustomerChange = (customerAcquisitionData: CustomerAcquisitionData[]): number => {
  if (customerAcquisitionData.length < 2) return 0;

  const sortedData = [...customerAcquisitionData].sort((a: CustomerAcquisitionData, b: CustomerAcquisitionData) => {
    if (a.Year !== b.Year) return a.Year - b.Year;
    return NEPALI_MONTHS.indexOf(a.Month) - NEPALI_MONTHS.indexOf(b.Month);
  });

  const currentMonth = sortedData[sortedData.length - 1];
  const previousMonth = sortedData[sortedData.length - 2];

  if (previousMonth.NewCustomers === 0) return currentMonth.NewCustomers > 0 ? 100 : 0;

  return ((currentMonth.NewCustomers - previousMonth.NewCustomers) / previousMonth.NewCustomers * 100);
};

// Helper function to convert English date to Nepali date
const convertToNepaliDate = (englishDate: Date): { month: string; year: number } => {
  const englishMonth = englishDate.getMonth();
  const englishYear = englishDate.getFullYear();
  const englishDay = englishDate.getDate();

  let nepaliYear = englishYear + 57;
  let nepaliMonthIndex = englishMonth;

  if (englishMonth < 3 || (englishMonth === 3 && englishDay < 14)) {
    nepaliYear = englishYear + 56;
  }

  const monthMapping = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
  nepaliMonthIndex = monthMapping[englishMonth];
  const nepaliMonth = NEPALI_MONTHS[nepaliMonthIndex];

  return { month: nepaliMonth, year: nepaliYear };
};

// Helper function to aggregate payments by month
const aggregatePaymentsByMonth = (payments: Payment[]): RevenueData[] => {
  console.log('Processing payments for revenue trend:', payments.length);
  const result: Record<string, RevenueData> = {};

  payments.forEach((payment, index) => {
    let month: string;
    let year: number;

    if (payment.paymentMonthNepali && payment.paymentYearNepali) {
      month = payment.paymentMonthNepali;
      year = payment.paymentYearNepali;
      if (index < 3) console.log(`Payment ${index}: Using backend Nepali date - ${month} ${year}`);
    } else {
      const paymentDate = new Date(payment.paymentDate);
      if (isNaN(paymentDate.getTime())) {
        console.warn(`Invalid payment date: ${payment.paymentDate}`);
        return;
      }
      const converted = convertToNepaliDate(paymentDate);
      month = converted.month;
      year = converted.year;
      if (index < 3) console.log(`Payment ${index}: Converted ${payment.paymentDate} to ${month} ${year}`);
    }

    const key = `${month}-${year}`;
    if (!result[key]) {
      result[key] = { month, year, revenue: 0 };
    }
    result[key].revenue += payment.totalAmountPaid;
  });

  const sortedResult = Object.values(result).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return NEPALI_MONTHS.indexOf(a.month) - NEPALI_MONTHS.indexOf(b.month);
  });

  console.log('Aggregated revenue data:', sortedResult);
  return sortedResult;
};

// Helper function to calculate revenue change percentage
const calculateRevenueChange = (payments: Payment[]): number => {
  if (!payments || payments.length === 0) return 0;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthRevenue = payments
    .filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate.getMonth() === currentMonth &&
             paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + payment.totalAmountPaid, 0);

  const previousMonthRevenue = payments
    .filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return paymentDate.getMonth() === prevMonth &&
             paymentDate.getFullYear() === prevYear;
    })
    .reduce((sum, payment) => sum + payment.totalAmountPaid, 0);

  if (previousMonthRevenue === 0) return currentMonthRevenue > 0 ? 100 : 0;

  return ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100);
};

// Helper function to calculate pending bills change (negative is good)
const calculatePendingBillsChange = (bills: ExtendedBill[]): number => {
  if (!bills || bills.length === 0) return 0;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthPending = bills.filter(bill => {
    const createdDate = new Date(bill.createdDate);
    return bill.status?.toLowerCase() === 'pending' &&
           createdDate.getMonth() === currentMonth &&
           createdDate.getFullYear() === currentYear;
  }).length;

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const previousMonthPending = bills.filter(bill => {
    const createdDate = new Date(bill.createdDate);
    return bill.status?.toLowerCase() === 'pending' &&
           createdDate.getMonth() === prevMonth &&
           createdDate.getFullYear() === prevYear;
  }).length;

  if (previousMonthPending === 0) return currentMonthPending > 0 ? 100 : 0;

  return ((currentMonthPending - previousMonthPending) / previousMonthPending * 100);
};

// Helper function to get change description for different metrics
const getChangeDescription = (change: number, metricType: string) => {
  const absChange = Math.abs(change);
  let direction, isPositive;

  switch (metricType) {
    case 'revenue':
    case 'customers':
      direction = change >= 0 ? 'increase' : 'decrease';
      isPositive = change >= 0;
      break;
    case 'pendingBills':
      direction = change >= 0 ? 'increase' : 'decrease';
      isPositive = change < 0;
      break;
    default:
      direction = change >= 0 ? 'increase' : 'decrease';
      isPositive = change >= 0;
  }

  return { direction, isPositive, absChange };
};

// Helper function to calculate active users (unique customers with payments in last 6 months)
const calculateActiveAccounts = (customers: Customer[], payments: Payment[]): number => {
  if (!customers || !payments || customers.length === 0 || payments.length === 0) return 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const activeCustomerIds = new Set(
    payments
      .filter(payment => new Date(payment.paymentDate) >= sixMonthsAgo)
      .map(payment => payment.cusId)
      .filter(cusId => cusId != null)
  );

  return activeCustomerIds.size;
};

// Components
const GradientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-200 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-pink-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);

const ChartCard = ({
  title,
  children,
  className = '',
  icon: Icon = undefined,
  loading = false
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
    className={`relative bg-white rounded-xl shadow-lg border border-gray-100 p-6 overflow-hidden ${className}`}
  >
    {loading ? (
      <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    ) : null}
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        {Icon && <Icon className="mr-2 text-blue-500 text-lg" />}
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

const RevenueTrendChart = ({ payments }: { payments: Payment[] }) => {
  const chartData = aggregatePaymentsByMonth(payments);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  console.log('RevenueTrendChart received payments:', payments.length);
  console.log('Chart data generated:', chartData);

  const formattedData = chartData.map((item: RevenueData, index: number) => ({
    ...item,
    monthYear: `${item.month.split(' ')[0].slice(0, 3)} ${item.year.toString().slice(2)}`,
    index
  }));

  const averageRevenue = chartData.length > 0
    ? chartData.reduce((sum: number, item: RevenueData) => sum + item.revenue, 0) / chartData.length
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No Revenue Data Available</p>
          <p className="text-sm">No payments found in the system</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        onMouseMove={(e) => {
          if (e && typeof e.activeLabel === 'string') {
            const idx = formattedData.findIndex((d: any) => d.monthYear === e.activeLabel);
            if (idx !== -1) setHoveredIndex(idx);
          }
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="monthYear"
          tick={{ fill: '#4B5563' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#4B5563' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `Rs. ${value / 1000}k`}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            color: '#1F2937'
          }}
          formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={(label) => {
            const fullMonth = NEPALI_MONTHS.find(m => m.startsWith(label.split(' ')[0]));
            return `${fullMonth} 20${label.split(' ')[1]}`;
          }}
        />
        {averageRevenue > 0 && (
          <ReferenceLine
            y={averageRevenue}
            stroke="#6B7280"
            strokeDasharray="3 3"
            label={{
              position: 'right',
              value: `Avg: Rs. ${Math.round(averageRevenue).toLocaleString()}`,
              fill: '#6B7280',
              fontSize: 12
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="none"
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563EB"
          strokeWidth={3}
          dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
          activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
        />
        {hoveredIndex !== null && (
          <ReferenceLine
            x={formattedData[hoveredIndex].monthYear}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

const SatisfactionMeter = ({ percentage }: { percentage: number }) => {
  const data = [
    {
      name: 'Satisfaction',
      value: percentage,
      fill: percentage > 75 ? '#10B981' : percentage > 50 ? '#F59E0B' : '#EF4444'
    }
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadialBarChart
        innerRadius="70%"
        outerRadius="100%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar
          background
          dataKey="value"
          cornerRadius={10}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold"
          fill="#1F2937"
        >
          {percentage}%
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm"
          fill="#6B7280"
        >
          Customer Satisfaction
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
};

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = 0;
    const increment = Math.ceil(value / (duration / 16));

    let current = start;
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

const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  metricType,
  className = ''
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  metricType: string;
  className?: string;
}) => {
  const { direction, isPositive, absChange } = change !== undefined
    ? getChangeDescription(change, metricType)
    : { direction: '', isPositive: true, absChange: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 relative overflow-hidden ${className}`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon className="text-blue-500 text-[80px]" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className="text-2xl font-bold text-gray-800 mt-2">
          <AnimatedCounter value={value} />
        </span>
        {change !== undefined && (
          <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? (
              <FiTrendingUp className="mr-1" />
            ) : (
              <svg className="w-4 h-4 mr-1 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
            {absChange.toFixed(1)}% {direction} from last month
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface DashboardProps {
  userTypeId: number;
}

const Dashboard = ({ userTypeId }: DashboardProps) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [, setBills] = useState<ExtendedBill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerAcquisitionData, setCustomerAcquisitionData] = useState<CustomerAcquisitionData[]>([]);
  const [billStatusData, setBillStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [stats, setStats] = useState({
    customers: 0,
    employees: 0,
    pendingBills: 0,
    branches: 0,
    totalRevenue: 0,
    newCustomers: 0,
    activeAccounts: 0,
    growthRate: 0,
    visitors: 0,
    customerSatisfaction: 82,
    revenueChange: 0,
    customerChange: 0,
    billChange: 0
  });
  const [branchEmployeeData, setBranchEmployeeData] = useState<{ name: string; employees: number }[]>([]);
  const [demandTypeData, setDemandTypeData] = useState<{ name: string; usage: number }[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<{ name: string; transactions: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers'>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const fetchBranchId = async () => {
      if (userTypeId !== 4) {
        setBranchId(null);
        setBranchName('');
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('No auth token found. Please log in.');
          navigate('/login');
          return;
        }

        const res = await fetch('http://localhost:5008/api/branchadmins/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch branch details: ${res.statusText}`);
        }

        const admin = await res.json();
        if (!admin) {
          toast.error('Branch information not found. Please contact your administrator.');
          return;
        }

        const fetchedBranchId = admin.BranchId || admin.branchId;
        const fetchedBranchName = admin.BranchName || admin.branchName || 'My Branch';

        if (!fetchedBranchId) {
          console.error('Branch admin found but no BranchId:', admin);
          toast.error('Branch ID not found in your profile. Please contact your administrator.');
          return;
        }

        setBranchId(fetchedBranchId);
        setBranchName(fetchedBranchName);
      } catch (error) {
        console.error('Failed to fetch branch ID:', error);
        toast.error('Failed to load branch information');
      }
    };

    fetchBranchId();
  }, [isAuthenticated, navigate, userTypeId]);

  useEffect(() => {
    if (userTypeId === 4 && branchId === null) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('No auth token found. Please log in.');
          navigate('/login');
          return;
        }

        console.log('Fetching dashboard data...');

        const isBranchAdmin = userTypeId === 4;
        const branchQuery = isBranchAdmin && branchId ? `?branchId=${branchId}` : '';

        const [customersRes, employeesRes, billsRes, branchesRes, paymentsRes, demandTypesRes, paymentMethodsRes] = await Promise.all([
          fetch(`http://localhost:5008/api/customers${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5008/api/employeedetails${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5008/api/Bills${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5008/api/Branch`, { headers: { Authorization: `Bearer ${token}` } }), // Branches always fetched without filter
          fetch(`http://localhost:5008/api/Payment${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5008/api/DemandType${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5008/api/PaymentMethod${isBranchAdmin ? '/by-branch' + branchQuery : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (customersRes.status === 401 || employeesRes.status === 401 || billsRes.status === 401 ||
            branchesRes.status === 401 || paymentsRes.status === 401 || demandTypesRes.status === 401 ||
            paymentMethodsRes.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }

        if (!customersRes.ok || !employeesRes.ok || !billsRes.ok || !branchesRes.ok || !paymentsRes.ok ||
            !demandTypesRes.ok || !paymentMethodsRes.ok) {
          const errorText = await billsRes.text();
          throw new Error(`Failed to fetch one or more resources: Bills API returned ${billsRes.status} - ${errorText}`);
        }

        const [customers, employees, bills, branches, payments, demandTypes, paymentMethods]: [
          Customer[], Employee[], ExtendedBill[], Branch[], Payment[], DemandType[], PaymentMethod[]
        ] = await Promise.all([
          customersRes.json(),
          employeesRes.json(),
          billsRes.json(),
          branchesRes.json(),
          paymentsRes.json(),
          demandTypesRes.json(),
          paymentMethodsRes.json(),
        ]);

        console.log('Fetched payments:', payments.length);
        console.log('Sample payment data:', payments[0]);

        const enrichedBills = bills.map((bill: ExtendedBill) => ({
          ...bill,
          customerName: bill.customer?.name ?? 'Unknown',
          customerAddress: bill.customer?.address ?? '',
        }));

        setBills(enrichedBills);
        setPayments(payments);
        setBillStatusData(aggregateBillStatus(enrichedBills));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCustomers = customers.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
        
        const activeAccounts = calculateActiveAccounts(customers, payments);
        
        const pendingBills = enrichedBills.filter(b => 
          typeof b.status === 'string' ? b.status.toLowerCase() === 'pending' : false
        ).length;
        
        const prevYearCustomers = customers.filter(c => new Date(c.createdAt).getFullYear() < new Date().getFullYear()).length;
        const currYearCustomers = customers.filter(c => new Date(c.createdAt).getFullYear() === new Date().getFullYear()).length;
        const growthRate = prevYearCustomers > 0 ? ((currYearCustomers - prevYearCustomers) / prevYearCustomers * 100) : 0;

        const branchEmployeeCounts = branches.map(branch => ({
          name: branch.name,
          employees: employees.filter(emp => emp.branchId === branch.branchId).length,
        }));

        const demandTypeCounts = demandTypes.map(demand => ({
          name: demand.name,
          usage: customers.filter(cust => {
            if (typeof cust.demandType === 'string') return cust.demandType === demand.name;
            if (cust.demandType && typeof cust.demandType === 'object') return cust.demandType.name === demand.name;
            return false;
          }).length,
        }));

        const paymentMethodCounts = paymentMethods.map(method => {
          const transactions = payments.filter(payment => {
            if (typeof payment.paymentMethod === 'string') return payment.paymentMethod === method.name;
            if (payment.paymentMethod && typeof payment.paymentMethod === 'object') return payment.paymentMethod.name === method.name;
            return false;
          }).length;
          return { name: method.name, transactions };
        });

        const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmountPaid, 0);

        const dynamicRevenueChange = calculateRevenueChange(payments);
        const dynamicBillChange = calculatePendingBillsChange(enrichedBills);

        console.log('Total revenue calculated:', totalRevenue);
        console.log('Active accounts (unique customers with payments in last 6 months):', activeAccounts);
        console.log('Revenue change:', dynamicRevenueChange);
        console.log('Pending bills change:', dynamicBillChange);

        setStats(prevStats => ({
          ...prevStats,
          customers: customers.length,
          employees: employees.length,
          pendingBills: pendingBills,
          branches: branches.length,
          totalRevenue,
          newCustomers,
          activeAccounts,
          growthRate: parseFloat(growthRate.toFixed(2)),
          visitors: 15000,
          customerSatisfaction: 82,
          revenueChange: parseFloat(dynamicRevenueChange.toFixed(1)),
          customerChange: 0,
          billChange: parseFloat(dynamicBillChange.toFixed(1))
        }));

        setBranchEmployeeData(branchEmployeeCounts);
        setDemandTypeData(demandTypeCounts);
        setPaymentMethodData(paymentMethodCounts);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        toast.error(`Failed to load dashboard data`);
        setBillStatusData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, navigate, branchId, userTypeId]);

  const fetchCustomerAcquisition = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('No auth token found. Please log in.');
      navigate('/login');
      return;
    }

    // Prepare the URL based on user type
    let url = 'http://localhost:5008/api/customers/acquisitions-by-month';
    
    // Add branchId parameter only for branch admins (userTypeId 4)
    if (userTypeId === 4 && branchId) {
      url += `?branchId=${branchId}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (res.status === 401) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch customer acquisition data: ${res.statusText}`);
    }

    const data = await res.json();
    const aggregatedData: Record<string, CustomerAcquisitionData> = {};
    
    // Handle both response formats (item.month vs item.Month)
    data.forEach((item: any) => {
      const month = item.Month || item.month;
      const year = item.Year || item.year;
      const count = item.NewCustomers || item.newCustomers;
      
      const monthYear = `${month}-${year}`;
      if (aggregatedData[monthYear]) {
        aggregatedData[monthYear].NewCustomers += count;
      } else {
        aggregatedData[monthYear] = {
          Month: month,
          Year: year,
          NewCustomers: count,
          MonthYear: `${month} ${year}`
        };
      }
    });

    const formattedData = Object.values(aggregatedData).sort((a, b) => {
      if (a.Year !== b.Year) return a.Year - b.Year;
      return NEPALI_MONTHS.indexOf(a.Month) - NEPALI_MONTHS.indexOf(b.Month);
    });

    setCustomerAcquisitionData(formattedData);
  } catch (error) {
    console.error('Error fetching customer acquisition:', error);
    toast.error('Failed to load customer acquisition data.');
    setCustomerAcquisitionData([]);
  }
};

// Call it in your useEffect
useEffect(() => {
  if (userTypeId === 4 && branchId === null) return;

  if (!isAuthenticated) {
    toast.error('Session expired. Please log in again.');
    navigate('/login');
    return;
  }

  fetchCustomerAcquisition();
}, [isAuthenticated, navigate, branchId, userTypeId]);
  useEffect(() => {
    if (customerAcquisitionData.length >= 2) {
      const dynamicCustomerChange = calculateCustomerChange(customerAcquisitionData);
      setStats(prevStats => ({
        ...prevStats,
        customerChange: parseFloat(dynamicCustomerChange.toFixed(1))
      }));
    }
  }, [customerAcquisitionData]);

  const revenueTrendData = aggregatePaymentsByMonth(payments).map((item: RevenueData) => ({
    month: item.month,
    revenue: item.revenue,
    target: item.revenue * 1.2,
  }));

  const COLORS = ['#4CAF50', '#2563EB', '#FF9800', '#F44336', '#9C27B0', '#22C55E'];

  function aggregateBillStatus(bills: ExtendedBill[]): { name: string; value: number; color: string }[] {
    const statusCounts: Record<string, number> = {};
    bills.forEach(bill => {
      const status = typeof bill.status === 'string' ? bill.status : '';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const statusColors: Record<string, string> = {
      Paid: '#4CAF50',
      Pending: '#FF9800',
      Overdue: '#F44336',
      Cancelled: '#9C27B0',
      Other: '#2563EB'
    };
    return Object.entries(statusCounts).map(([name, value], i) => ({
      name,
      value,
      color: statusColors[name] || COLORS[i % COLORS.length]
    }));
  }

  if (isLoading) {
    return (
      <div className={`flex min-h-screen bg-gradient-to-tr from-blue-50 to-white transition-all duration-300`}>
        <GradientBackground />
        <div className="flex-1 p-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-8 animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6 h-32 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6 h-80 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="h-full bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-gradient-to-tr from-blue-50 to-white transition-all duration-300`}>
      <GradientBackground />
      <div className="flex-1 p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{userTypeId === 4 ? `Branch Dashboard - ${branchName}` : 'Welcome Back, Admin!'}</h1>
              <p className="text-gray-600">
                 Here's what's happening {userTypeId === 4 ? 'with your branch' : 'with your business'} today.
              </p>
            </div>
            <div className="flex space-x-2 mt-4 md:mt-0 bg-white p-1 rounded-lg shadow-inner border border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'revenue' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Revenue
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'customers' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Customers
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatsCard
              title="Total Customers"
              value={stats.customers}
              change={stats.customerChange}
              icon={FiUsers}
              metricType="customers"
            />
            <StatsCard
              title="Total Revenue"
              value={stats.totalRevenue}
              change={stats.revenueChange}
              icon={FiDollarSign}
              metricType="revenue"
            />
            <StatsCard
              title="Pending Bills"
              value={stats.pendingBills}
              change={stats.billChange}
              icon={FiClock}
              metricType="pendingBills"
            />
            <StatsCard
              title="Active Users"
              value={stats.activeAccounts}
              icon={FiActivity}
              metricType="customers"
            />
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                <ChartCard title="Customer Acquisition" icon={FiUsers}>
                  {customerAcquisitionData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <p>No customer data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={customerAcquisitionData}>
                        <defs>
                          <linearGradient id="colorNewCustomers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                          dataKey="MonthYear"
                          stroke="#4B5563"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => {
                            const [month, year] = value.split(' ');
                            return `${month.slice(0, 3)} '${year.slice(2)}`;
                          }}
                        />
                        <YAxis
                          stroke="#4B5563"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #E5E7EB',
                            color: '#1F2937'
                          }}
                          formatter={(value: number) => [`${value} customers`, 'New Customers']}
                          labelFormatter={(label) => {
                            const [month, year] = label.split(' ');
                            return `${month} ${year}`;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="NewCustomers"
                          stroke="#10B981"
                          fillOpacity={1}
                          fill="url(#colorNewCustomers)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Bill Status Distribution" icon={FiBarChart2}>
                  {billStatusData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <p>Bill status data not available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={billStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          paddingAngle={5}
                          label={(props) => {
                            const { name, percent } = props;
                            return `${name ?? ''}: ${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%`;
                          }}
                        >
                          {billStatusData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value} bills`, 'Bills']}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #E5E7EB',
                            color: '#1F2937'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <ChartCard title="Revenue Trend (Actual Payments)" icon={FiTrendingUp} className="lg:col-span-2">
                  <RevenueTrendChart payments={payments} />
                </ChartCard>
                <ChartCard title="Customer Satisfaction" icon={FiPieChart}>
                  <SatisfactionMeter percentage={stats.customerSatisfaction} />
                </ChartCard>
              </div>

            </>
          )}

          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <ChartCard title="Revenue vs Target (Payment Based)" icon={FiTrendingUp}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value.split(' ')[0].slice(0, 8)}
                    />
                    <YAxis
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `Rs. ${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [`Rs. ${value.toLocaleString()}`, 'Actual Revenue (Paid)'];
                        return [`Rs. ${value.toLocaleString()}`, 'Target'];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
                      name="Actual Revenue (Paid)"
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#6B7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Payment Methods" icon={FiDollarSign}>
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
                      label={(props) => `${props.name ?? ''}: ${((props.percent ?? 0) * 100).toFixed(2)}%`}
                    >
                      {paymentMethodData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} transactions`, 'Transactions']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <ChartCard title="Demand Type Usage" icon={FiUsers}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demandTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                      formatter={(value: number) => [`${value} customers`, 'Customers']}
                    />
                    <Bar
                      dataKey="usage"
                      fill="#9C27B0"
                      name="Customers"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Branch Employee Distribution" icon={FiUsers}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={branchEmployeeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value.split(' ')[0]}
                    />
                    <YAxis
                      stroke="#4B5563"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                      formatter={(value: number) => [`${value} employees`, 'Employees']}
                    />
                    <Bar
                      dataKey="employees"
                      fill="#FF9800"
                      name="Employees"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md p-6 mb-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-4 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/billForm?new=true')}
              >
                <FiDollarSign size={20} className="mb-2" />
                <span className="text-sm font-medium">Generate Bills</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-green-50 hover:bg-green-100 text-green-600 p-4 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/Customers/create?new=true')}
              >
                <FiUsers size={20} className="mb-2" />
                <span className="text-sm font-medium">Add Customer</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-purple-50 hover:bg-purple-100 text-purple-600 p-4 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/report')}
              >
                <FiActivity size={20} className="mb-2" />
                <span className="text-sm font-medium">View Reports</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-4 rounded-lg flex flex-col items-center transition-colors"
                onClick={() => navigate('/billList?status=pending')}
              >
                <FiClock size={20} className="mb-2" />
                <span className="text-sm font-medium">Pending Bills</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;