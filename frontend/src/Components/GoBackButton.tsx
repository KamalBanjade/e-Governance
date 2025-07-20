// import React from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { FiArrowLeft } from 'react-icons/fi';

// const GoBackButton: React.FC = () => {
//   const navigate = useNavigate();
//   const location = useLocation();

//   // Get user info from localStorage
//   const userTypeId = localStorage.getItem('userTypeId');
//   const userRole = localStorage.getItem('userRole');

//   // Define dashboard routes and auth pages - don't show back button on these
//   const dashboardRoutes = ['/admin-dashboard', '/employee-dashboard', '/customer-dashboard'];
//   const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
//   const excludedRoutes = [...dashboardRoutes, ...authRoutes, '/unauthorized'];

//   // Don't show back button on excluded pages
//   if (excludedRoutes.includes(location.pathname)) {
//     return null;
//   }

//   // Hide back button ONLY on /billform for customers (but show it on /Payments)
//   if (location.pathname === '/billform' && userTypeId === '3' && userRole === 'Customer') {
//     return null;
//   }

//   const handleGoBack = () => {
//     navigate(-1);
//   };

//   return (
//     <button
//       onClick={handleGoBack}
//       className="
//         mb-4 flex items-center gap-2 px-5 py-2.5
//         text-blue-600 hover:text-white
//         bg-blue-50 hover:bg-blue-600
//         border border-blue-200 hover:border-blue-600
//         rounded-full shadow-sm hover:shadow-lg
//         transition-all duration-300 ease-in-out
//         font-medium
//       "
//       title="Go Back"
//     >
//       <FiArrowLeft className="h-5 w-5" />
//       Back
//     </button>
//   );
// };

// export default GoBackButton;