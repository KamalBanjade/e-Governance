import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';
import {
  FiFileText,
  FiPlus,
  FiClock,
  FiTrendingUp,
  FiActivity,
  FiCalendar,
  FiZap,
  FiDollarSign,
  FiTarget,
  FiAward,
  FiUser,
  FiBarChart2
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../Components/AuthContext';
import { getAuthToken } from '../utility/auth';

const API_BASE_URL = 'http://localhost:5008/api';

interface Bill {
  billNo: number | null;
  cusId: number;
  billDate: string;
  billMonth: string;
  billYear: number;
  totalBillAmount: number | null;
  status: string | null;
  createdDate: string;
  createdBy?: string;
  customer?: {
    name: string;
    address: string;
  };
  createdMonthNepali?: string;
  createdYearNepali?: number;
  createdDayNepali?: number;
}

interface DailyStats {
  date: string;
  bills: number;
  amount: number;
}

interface MonthlyStats {
  month: string;
  year: number;
  bills: number;
  amount: number;
  monthYear: string;
}

interface UserInfo {
  role: string;
  userTypeId: number;
  userId: string;
  branchId?: number;
  email?: string;
  userName?: string;
}

interface NepaliDate {
  year: number;
  month: string;
  day: number;
  formatted: string;
}

const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const GradientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-20 -left-20 w-64 h-64 bg-green-200 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-1/2 right-0 w-64 h-64 bg-blue-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: { value: number; label: string };
}) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-800', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-800', border: 'border-green-200' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-800', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-800', border: 'border-purple-200' },
    pink: { bg: 'bg-pink-50', icon: 'text-pink-600', text: 'text-pink-800', border: 'border-pink-200' }
  };

  const colors = colorMap[color as keyof typeof colorMap] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`${colors.bg} ${colors.border} rounded-xl border p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <div className={`${colors.icon} mb-2`}>
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={`flex flex-col items-end ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <div className="flex items-center">
              <FiTrendingUp className={`mr-1 w-4 h-4 ${trend.value < 0 ? 'transform rotate-180' : ''}`} />
              <span className="text-sm font-medium">
                {Math.abs(trend.value)}%
              </span>
            </div>
            <span className="text-xs mt-1">{trend.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ChartCard = ({
  title,
  children,
  className = '',
  icon: Icon
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.005 }}
    transition={{ duration: 0.3 }}
    className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${className} hover:shadow-xl transition-shadow duration-300`}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        {Icon && <Icon className="mr-2 text-blue-500" />}
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

const RecentBillCard = ({ bill }: { bill: Bill }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ x: 5 }}
    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-300 group"
  >
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
        <FiFileText className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p className="font-medium text-gray-900">Bill #{bill.billNo ?? 'N/A'}</p>
        <p className="text-sm text-gray-500">{bill.customer?.name || 'Customer'}</p>
        <p className="text-xs text-gray-400">{bill.billMonth} {bill.billYear}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-semibold text-gray-900">
        रु. {bill.totalBillAmount !== null && bill.totalBillAmount !== undefined ? bill.totalBillAmount.toFixed(2) : '0.00'}
      </p>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bill.status === 'Paid'
          ? 'bg-green-100 text-green-800'
          : bill.status === 'Pending'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-red-100 text-red-800'
        }`}>
        {bill.status || 'Unknown'}
      </span>
    </div>
  </motion.div>
);

const ClerkDashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [branchName, setBranchName] = useState<string>('Loading...');
  const [currentNepali, setCurrentNepali] = useState<NepaliDate | null>(null);
  const [stats, setStats] = useState({
    totalBills: 0,
    thisMonthBills: 0,
    todayBills: 0,
    totalAmount: 0,
    avgBillAmount: 0,
    pendingBills: 0,
    paidBills: 0,
    billChange: 0,
    amountChange: 0
  });

// Add this to your decodeToken function for debugging
const decodeToken = (token: string): UserInfo | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Debug: Log the entire payload to see what's available
    console.log('Full JWT payload:', payload);
    
    const branchIdFromStorage = localStorage.getItem('userBranchId');
    const userNameFromStorage = localStorage.getItem('userName');
    
    // Check multiple possible locations for branchId in the token
    const branchId = payload.branchId || 
                     payload.BranchId || 
                     payload['http://schemas.custom.com/branchId'] ||
                     payload.branch_id;
    
    console.log('Branch ID found in token:', branchId);
    console.log('Branch ID from localStorage:', branchIdFromStorage);
    
    return {
      role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'Clerk',
      userTypeId: parseInt(payload.userTypeId || '2'),
      userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 'user-id',
      branchId: branchId ? parseInt(branchId.toString()) : (branchIdFromStorage ? parseInt(branchIdFromStorage) : undefined),
      email: payload.email || 'unknown@example.com',
      userName: userNameFromStorage || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'User'
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('No auth token found. Please log in.');
      navigate('/login');
      return;
    }

    const decoded = decodeToken(token);
    setUserInfo(decoded);

   // Simplified fetchBranch function using the new endpoint
const fetchBranch = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/Branch/user-branch`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.status === 401) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }
    
    if (!res.ok) {
      if (res.status === 404) {
        setBranchName('Branch Not Found');
      } else {
        throw new Error('Failed to fetch branch');
      }
      return;
    }
    
    const branch = await res.json();
    setBranchName(branch.name || 'Unknown Branch');
    
  } catch (error) {
    console.error('Error fetching branch:', error);
    toast.error('Failed to load branch information');
    setBranchName('Unknown Branch');
  }
};

    const fetchCurrentNepaliDate = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/Bills/current-nepali-date`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch Nepali date');
        const data = await res.json();
        setCurrentNepali({
          year: data.year,
          month: data.month.split(' ')[0],
          day: data.day,
          formatted: data.formatted
        });
      } catch (error) {
        console.error('Error fetching Nepali date:', error);
        toast.error('Failed to load current date');
      }
    };

    fetchBranch();
    fetchCurrentNepaliDate();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!userInfo || !currentNepali) return;

    const fetchBills = async () => {
      setIsLoading(true);
      try {
        const token = getAuthToken();
        if (!token) throw new Error('No token');

        const response = await fetch(`${API_BASE_URL}/Bills/by-current-user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch bills');

        const data = await response.json();
        const validBills = (data || []).filter((bill: Bill) => bill.billNo != null && bill.createdDate);
        setBills(validBills);
      } catch (error) {
        console.error('Error fetching bills:', error);
        toast.error('Failed to load bills');
        setBills([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBills();
  }, [userInfo, currentNepali, navigate]);

  useEffect(() => {
    if (bills.length === 0 || !currentNepali) return;

    calculateStats(bills);
    generateChartData(bills);
  }, [bills, currentNepali]);

  const calculateStats = (bills: Bill[]) => {
    if (!currentNepali) return;

    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0];

    // Today's bills - using createdDate (Gregorian)
    const todayBills = bills.filter(bill =>
      new Date(bill.createdDate).toISOString().split('T')[0] === todayDateStr
    ).length;

    const currentMonth = currentNepali.month;
    const currentYear = currentNepali.year;

    // This month's bills (Nepali)
    const thisMonthBills = bills.filter(b =>
      b.createdYearNepali === currentYear &&
      b.createdMonthNepali === currentMonth
    ).length;

    // Last month's data for comparison
    let lastMonthIndex = NEPALI_MONTHS.indexOf(currentMonth) - 1;
    let lastMonthYear = currentYear;
    if (lastMonthIndex < 0) {
      lastMonthIndex = 11;
      lastMonthYear--;
    }
    const lastMonth = NEPALI_MONTHS[lastMonthIndex];

    const lastMonthBills = bills.filter(b =>
      b.createdYearNepali === lastMonthYear &&
      b.createdMonthNepali === lastMonth
    ).length;

    const lastMonthAmount = bills
      .filter(b => b.createdYearNepali === lastMonthYear && b.createdMonthNepali === lastMonth)
      .reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0);

    const thisMonthAmount = bills
      .filter(b => b.createdYearNepali === currentYear && b.createdMonthNepali === currentMonth)
      .reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0);

    const billChange = lastMonthBills > 0
      ? ((thisMonthBills - lastMonthBills) / lastMonthBills * 100)
      : (thisMonthBills > 0 ? 100 : 0);

    const amountChange = lastMonthAmount > 0
      ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount * 100)
      : (thisMonthAmount > 0 ? 100 : 0);

    const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0);
    const avgBillAmount = bills.length > 0 ? totalAmount / bills.length : 0;
    const pendingBills = bills.filter(bill => (bill.status || '').toLowerCase() === 'pending').length;
    const paidBills = bills.filter(bill => (bill.status || '').toLowerCase() === 'paid').length;

    setStats({
      totalBills: bills.length,
      thisMonthBills,
      todayBills,
      totalAmount,
      avgBillAmount,
      pendingBills,
      paidBills,
      billChange: parseFloat(billChange.toFixed(1)),
      amountChange: parseFloat(amountChange.toFixed(1))
    });
  };

  const generateChartData = (bills: Bill[]) => {
    // Daily stats for last 7 days (Gregorian)
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const dailyData = last7Days.map(dateStr => {
      const dayBills = bills.filter(bill =>
        new Date(bill.createdDate).toISOString().split('T')[0] === dateStr
      );
      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        bills: dayBills.length,
        amount: dayBills.reduce((sum, bill) => sum + (bill.totalBillAmount || 0), 0)
      };
    });

    // Monthly stats (Nepali)
    const monthlyData: Record<string, MonthlyStats> = {};
    bills.forEach(bill => {
      let month = bill.createdMonthNepali || '';
      let year = bill.createdYearNepali || 0;

      if (!month || !year) {
        const createdDate = new Date(bill.createdDate);
        const nepaliDate = new Date(createdDate.getTime() + (2077 - 2020) * 365 * 24 * 60 * 60 * 1000);
        month = NEPALI_MONTHS[nepaliDate.getMonth()];
        year = nepaliDate.getFullYear();
      }

      const key = `${month}-${year}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month,
          year,
          bills: 0,
          amount: 0,
          monthYear: `${month.slice(0, 3)} ${year.toString().slice(2)}`
        };
      }
      monthlyData[key].bills += 1;
      monthlyData[key].amount += bill.totalBillAmount || 0;
    });

    const sortedMonthlyData = Object.values(monthlyData)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return NEPALI_MONTHS.indexOf(a.month) - NEPALI_MONTHS.indexOf(b.month);
      })
      .slice(-6);

    setDailyStats(dailyData);
    setMonthlyStats(sortedMonthlyData);
  };

  const statusData = bills.reduce((acc: Record<string, number>, bill) => {
    const status = bill.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusData).map(([name, value], i) => ({
    name,
    value,
    color: COLORS[i % COLORS.length]
  }));

  const recentBills = [...bills]
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-tr from-green-50 to-blue-50">
        <GradientBackground />
        <div className="flex-1 p-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-800">Loading your dashboard</h3>
                  <p className="text-gray-500 mt-1">Please wait while we fetch your bill data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-green-50 to-blue-50 transition-all duration-300">
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <GradientBackground />
      <div className="flex-1 p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
          >
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Employee Dashboard
                </span> - {branchName}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-gray-600">
                  Welcome, <span className="font-medium text-gray-700">{userInfo?.userName || 'Clerk'}</span>!
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/billform?new=true')}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              <FiPlus className="mr-2" />
              Create New Bill
            </motion.button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatsCard
              title="Total Bills Created"
              value={stats.totalBills}
              subtitle="All time"
              icon={FiFileText}
              color="blue"
            />
            <StatsCard
              title="This Month"
              value={stats.thisMonthBills}
              subtitle="Bills created"
              icon={FiCalendar}
              color="green"
              trend={{ value: stats.billChange, label: 'from last month' }}
            />
            <StatsCard
              title="Today's Work"
              value={stats.todayBills}
              subtitle="Bills created today"
              icon={FiClock}
              color="orange"
            />
            <StatsCard
              title="Total Revenue"
              value={`रु. ${stats.totalAmount.toLocaleString('en-IN')}`}
              subtitle="All bills"
              icon={FiDollarSign}
              color="purple"
              trend={{ value: stats.amountChange, label: 'revenue change' }}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Daily Activity */}
            <ChartCard title="Daily Activity (Last 7 Days)" icon={FiActivity}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #E5E7EB'
                    }}
                    formatter={(value, name) => {
                      if (name === 'amount') return [`रु. ${value}`, 'Total Amount'];
                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="bills"
                    name="Bills Created"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Monthly Performance */}
            <ChartCard title="Monthly Performance" icon={FiTrendingUp}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyStats}>
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
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #E5E7EB'
                    }}
                    formatter={(value, name) => {
                      if (name === 'amount') return [`रु. ${value}`, 'Total Amount'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bills"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#10B981', strokeWidth: 2 }}
                    name="Bills Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Total Amount (रु.)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Bill Status and Recent Bills */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Bill Status Distribution */}
            <ChartCard title="Bill Status" icon={FiZap}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={5}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} bills`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Recent Bills */}
            <div className="lg:col-span-2">
              <ChartCard title="Recent Bills" icon={FiFileText}>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {recentBills.length > 0 ? (
                    recentBills.map((bill, index) => (
                      <RecentBillCard key={bill.billNo != null ? bill.billNo.toString() : `fallback-${index}`} bill={bill} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FiFileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p>No bills created yet</p>
                      <p className="text-sm">Start creating bills to see them here</p>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FiTarget className="mr-2 text-blue-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/billform?new=true')}
                className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 p-4 rounded-lg flex flex-col items-center transition-all duration-300 border border-blue-200"
              >
                <FiPlus className="w-6 h-6 mb-2" />
                <span className="font-medium">Create New Bill</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/billlist')}
                className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 p-4 rounded-lg flex flex-col items-center transition-all duration-300 border border-green-200"
              >
                <FiFileText className="w-6 h-6 mb-2" />
                <span className="font-medium">View My Bills</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/billlist?status=pending')}
                className="bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-700 p-4 rounded-lg flex flex-col items-center transition-all duration-300 border border-orange-200"
              >
                <FiClock className="w-6 h-6 mb-2" />
                <span className="font-medium">Pending Bills</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <FiAward className="mr-2" />
                  Performance Summary
                </h3>
                <p className="text-blue-100">
                  You've created {stats.totalBills} bills with a total value of रु. {stats.totalAmount.toLocaleString('en-IN')}
                </p>
                <div className="mt-2 flex space-x-4">
                  <div className="flex items-center">
                    <FiBarChart2 className="mr-1 text-blue-200" />
                    <span className="text-sm">
                      {stats.thisMonthBills} bills this month ({stats.billChange >= 0 ? '+' : ''}{stats.billChange}%)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FiDollarSign className="mr-1 text-blue-200" />
                    <span className="text-sm">
                      रु. {stats.thisMonthBills > 0 ?
                        (stats.totalAmount / stats.thisMonthBills).toFixed(2) : '0.00'} average
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <FiAward className="w-12 h-12 text-blue-200 opacity-70" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ClerkDashboard;