import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiHome,
  FiBarChart2,
  FiCreditCard,
  FiDollarSign,
  FiUserPlus,
  FiFileText,
  FiClock,
  FiCalendar,
} from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const actions = [
    { title: 'Create Employee', icon: FiUsers, path: '/employees/create', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { title: 'Add Branch', icon: FiHome, path: '/branch', color: 'bg-purple-500', hover: 'hover:bg-purple-600' },
    { title: 'Add Demand', icon: FiBarChart2, path: '/demand', color: 'bg-red-500', hover: 'hover:bg-red-600' },
    { title: 'Payment Method', icon: FiCreditCard, path: '/paymentmethod', color: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
    { title: 'Payments', icon: FiDollarSign, path: '/Payments', color: 'bg-orange-500', hover: 'hover:bg-orange-600' },
    { title: 'New Customer', icon: FiUserPlus, path: '/Customers/create', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { title: 'New Bill', icon: FiFileText, path: '/billform', color: 'bg-green-500', hover: 'hover:bg-green-600' },
  ];

  const handleActionClick = (path: string) => navigate(path);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back! Here's your control panel</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center text-sm text-gray-600">
                  <FiClock className="w-4 h-4 mr-1" />
                  {formatTime(currentTime)}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <FiCalendar className="w-3 h-3 mr-1" />
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actions.map((action, index) => (
              <div
                key={index}
                onClick={() => handleActionClick(action.path)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${action.color} ${action.hover} p-3 rounded-full group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">Manage related records efficiently</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <FiUsers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Employee created</p>
                <p className="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full">
                <FiHome className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Branch added</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-orange-100 p-2 rounded-full">
                <FiDollarSign className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Payment processed</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
