import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiFileText, FiMapPin, FiDollarSign, FiTrendingUp, FiCreditCard, FiActivity, FiUsers, FiClock, FiCalendar } from 'react-icons/fi';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const quickActions = [
    {
      title: 'New Customer',
      description: 'Add a new customer to the system',
      icon: FiUserPlus,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/Customers/create'
    },
    {
      title: 'New Bill',
      description: 'Create a new bill for services',
      icon: FiFileText,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/billform'
    },
    {
      title: 'Add Branch',
      description: 'Register a new branch location',
      icon: FiMapPin,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      path: '/branch'
    },
    {
      title: 'Payments',
      description: 'Process and view payments',
      icon: FiDollarSign,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      path: '/Payments'
    },
    {
      title: 'Add Demand',
      description: 'Create new demand entries',
      icon: FiTrendingUp,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      path: '/demand'
    },
    {
      title: 'Payment Method',
      description: 'Manage payment methods',
      icon: FiCreditCard,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      path: '/paymentmethod'
    }
  ];

  const stats = [
    {
      title: 'Today\'s Tasks',
      value: '12',
      icon: FiActivity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Bills',
      value: '8',
      icon: FiFileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'New Customers',
      value: '5',
      icon: FiUsers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Payments Due',
      value: '23',
      icon: FiDollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const handleActionClick = (path: string) => {
    navigate(path);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
   <div className="min-h-screen bg-gradient-to-tr from-blue-100 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back! Here's your workspace</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => handleActionClick(action.path)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${action.color} ${action.hoverColor} p-3 rounded-full group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
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
                <p className="text-sm font-medium text-gray-900">New customer registered</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <FiFileText className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Bill #1234 processed</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-orange-100 p-2 rounded-full">
                <FiDollarSign className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Payment received</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;