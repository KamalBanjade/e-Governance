// Components/GoBackButton.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const GoBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboardPath = [
    '/employee-dashboard',
    '/admin-dashboard',
    '/customer-dashboard',
  ].includes(location.pathname);

  if (isDashboardPath) return null;

  const goBackPath = () => {
    if (location.pathname.startsWith('/billform') || location.pathname.startsWith('/branch') || location.pathname.startsWith('/demand') || location.pathname.startsWith('/paymentmethod') || location.pathname.startsWith('/Customers')) {
      return '/employee-dashboard';
    }
    if (location.pathname.startsWith('/employees')) return '/admin-dashboard';
    if (location.pathname.startsWith('/Payments') && localStorage.getItem('userTypeId') === '3') {
      return '/customer-dashboard';
    }
    return '/'; // fallback
  };

  return (
    <button
      onClick={() => navigate(goBackPath())}
      className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
    >
      <FiArrowLeft className="mr-2" />
      Back to Dashboard
    </button>
  );
};

export default GoBackButton;
