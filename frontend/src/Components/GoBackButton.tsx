import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const GoBackButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Define dashboard routes - don't show back button on these
  const dashboardRoutes = ['/admin-dashboard', '/employee-dashboard', '/customer-dashboard'];

  // Don't show back button on dashboard pages
  if (dashboardRoutes.includes(location.pathname)) {
    return null;
  }

  // Get the appropriate dashboard based on user role
  const getDefaultDashboard = () => {
    const userRole = localStorage.getItem('userRole');
    // const userTypeId = localStorage.getItem('userTypeId');

    if (userRole === 'Admin') return '/admin-dashboard';
    if (userRole === 'Clerk') return '/employee-dashboard';
    // Remove customer dashboard option - customers don't get back to dashboard
    // if (userTypeId === '3') return '/customer-dashboard';
    return '/login';
  };

  const handleGoBack = () => {
    const userTypeId = localStorage.getItem('userTypeId');
    
    // For customers (userTypeId === '3'), don't navigate back to dashboard
    // Instead, use browser back or go to login
    if (userTypeId === '3') {
      // Option 1: Use browser back
      navigate(-1);
      // Option 2: Go to login (uncomment if preferred)
      // navigate('/login', { replace: true });
      return;
    }

    // For admin and clerk, navigate to appropriate dashboard
    const dashboardPath = getDefaultDashboard();
    navigate(dashboardPath, { replace: true });
  };

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 hover:shadow-md"
      title="Back to Dashboard"
    >
      <FiArrowLeft className="w-4 h-4" />
      <span className="text-sm font-medium">Back to Dashboard</span>
    </button>
  );
};

export default GoBackButton;