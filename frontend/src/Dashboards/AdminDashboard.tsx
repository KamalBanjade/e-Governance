// AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiHome, FiBarChart2, FiCreditCard, FiDollarSign, FiUserPlus, FiFileText, FiList,
} from 'react-icons/fi';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();



  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');

        const [customersRes, employeesRes, billsRes, branchesRes] = await Promise.all([
          fetch('http://localhost:5008/api/customers', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5008/api/employeedetails', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5008/api/Bills', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5008/api/Branch', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!employeesRes.ok) throw new Error('Failed to fetch employees');
        if (!billsRes.ok) throw new Error('Failed to fetch bills');
        if (!branchesRes.ok) throw new Error('Failed to fetch branches');

        const customers = await customersRes.json();
        const employees = await employeesRes.json();
        const bills = await billsRes.json();
        const branches = await branchesRes.json();

        setStats({
          customers: customers.length,
          employees: employees.length,
          pendingBills: bills.length,
          branches: branches.length,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const [stats, setStats] = useState({
    customers: 0,
    employees: 0,
    pendingBills: 0,
    branches: 0,
  });




  const actions = [
    { title: 'Create Employee', icon: FiUsers, path: '/employees/create?new=true', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
     { title: 'New Customer', icon: FiUserPlus, path: '/Customers/create?new=true', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { title: 'Add Branch', icon: FiHome, path: '/branch?new=true', color: 'bg-purple-500', hover: 'hover:bg-purple-600' },
     { title: 'New Bill', icon: FiFileText, path: '/billform?new=true', color: 'bg-green-500', hover: 'hover:bg-green-600' },
    { title: 'Add Demand', icon: FiBarChart2, path: '/demand', color: 'bg-red-500', hover: 'hover:bg-red-600' },
    { title: 'Payment Method', icon: FiCreditCard, path: '/paymentmethod', color: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
    { title: 'Payments', icon: FiDollarSign, path: '/Payments', color: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  ];
  const handleActionClick = (path: string) => {
    if (path === '/Customers/create') {
      localStorage.removeItem('editCustomerData');
      localStorage.removeItem('isEditOperation');
    }
    if (path.startsWith('/employees/create')) {
      localStorage.removeItem('editEmployeeData');  // Or whatever keys you use
      localStorage.removeItem('isEditOperation');   // If you use this for employees too
    }
    navigate(path);
  };


  const chartData = [
    { month: 'Jan', payments: 3000 },
    { month: 'Feb', payments: 4000 },
    { month: 'Mar', payments: 3500 },
    { month: 'Apr', payments: 5000 },
    { month: 'May', payments: 6000 },
    { month: 'Jun', payments: 7000 },
    { month: 'Jul', payments: 8000 },
    { month: 'Aug', payments: 7500 },
    { month: 'Sep', payments: 9000 },
    { month: 'Oct', payments: 9500 },
    { month: 'Nov', payments: 10000 },
    { month: 'Dec', payments: 12000 },
  ];

  return (
    <div className=" min-h-screen bg-gradient-to-tr from-sky-100 to-white dark:from-gray-900 dark:to-black">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here's your control panel</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Customers - Clickable */}
          <div onClick={() => navigate('/customerList')} className="cursor-pointer">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5 flex items-center space-x-4 hover:shadow-lg transition hover:scale-105">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.customers}</div>
                <div className="text-sm text-slate-500 dark:text-gray-400">Customers</div>
              </div>
            </div>
          </div>

          {/* Employees */}
          <div onClick={() => navigate('/EmployeeList')} className="cursor-pointer">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5 flex items-center space-x-4 hover:shadow-lg transition hover:scale-105">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.employees}</div>
                <div className="text-sm text-slate-500 dark:text-gray-400">Employees</div>
              </div>
            </div>
          </div>

          {/* Branches */}
         <div onClick={() => navigate('/BranchList')} className="cursor-pointer">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5 flex items-center space-x-4 hover:shadow-lg transition hover:scale-105">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.branches}</div>
                <div className="text-sm text-slate-500 dark:text-gray-400">Branches</div>
              </div>
            </div>
          </div>

          {/* Pending Bills */}
          <div onClick={() => navigate('/BillList')} className="cursor-pointer">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5 flex items-center space-x-4 hover:shadow-lg transition hover:scale-105">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.pendingBills}</div>
                <div className="text-sm text-slate-500 dark:text-gray-400">Pending Bills</div>
              </div>
            </div>
          </div>
        </div>



        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {actions.map((action, index) => (
              <div key={index} onClick={() => handleActionClick(action.path)} className="bg-gradient-to-br from-white to-sky-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-xl p-6 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${action.color} ${action.hover} p-3 rounded-full group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{action.title}</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">Manage related records efficiently</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-600 p-6 mb-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payments Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="payments" stroke="#6366f1" strokeWidth={2} />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[{ icon: FiUsers, label: 'Employee created', time: '5 minutes ago', color: 'bg-blue-100', text: 'text-blue-600' },
            { icon: FiHome, label: 'Branch added', time: '15 minutes ago', color: 'bg-purple-100', text: 'text-purple-600' },
            { icon: FiList, label: 'Customer list viewed', time: '1 hour ago', color: 'bg-teal-100', text: 'text-teal-600' }].map((activity, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className={`${activity.color} p-2 rounded-full`}>
                  <activity.icon className={`w-4 h-4 ${activity.text}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
