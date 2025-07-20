import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './Components/AuthContext';
import { DialogProvider } from './Contexts/DialogContext';
import CustomerForm from './Components/CustomerForm';
import CustomerList from './Components/CustomerList';
import EmployeeForm from './Components/EmployeeForm';
import LoginForm from './Components/LoginForm';
import RegisterForm from './Components/RegisterForm';
import ForgotPasswordForm from './Components/ForgotPasswordForm';
import ResetPasswordForm from './Components/ResetPasswordForm';
import Unauthorized from './utility/Unauthorized';
import RequireRole from './Components/RequireRole';
import BillForm from './Components/BillForm';
import BranchForm from './Components/BranchForm';
import DemandList from './Components/DemandList';
import DemandForm from './Components/DemandForm';
import PaymentMethodForm from './Components/PaymentMethodForm';
import PaymentMethodList from './Components/PaymentMethodList';
import PaymentForm from './Components/PaymentForm';
import AdminDashboard from './Dashboards/AdminDashboard';
import CustomerDashboard from './Dashboards/CustomerDashboard';
import EmployeeDashboard from './Dashboards/EmployeeDashboard';
// import GoBackButton from './Components/GoBackButton';
import CustomerProfileCompletion from './Components/CustomerProfileCompletion';
import PaymentPage from './Components/PaymentPage';
import EmployeeList from './Components/EmployeeList';
import BranchList from './Components/BranchList';
import BillList from './Components/BillList';
import GlobalNavbar from './Components/GlobalNavbar';
import PaymentList from './Components/PaymentList';
import Sidebar from './Components/SideBar';

const AppContent = () => {
  const { isAuthenticated, userTypeId, requiresCustomerProfile, handleLogin } = useAuth();
  const location = useLocation();
  const [sidebarPinned, setSidebarPinned] = useState(true);

  // Routes where the sidebar should not appear
  const noSidebarRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/complete-profile',
    '/unauthorized'
  ];
  const storedRole = localStorage.getItem('userRole');

  // Determine if the sidebar should be shown
  const showSidebar = isAuthenticated && !noSidebarRoutes.includes(location.pathname);

  const getDefaultRoute = () => {
    const storedRole = localStorage.getItem('userRole');
    const storedTypeId = localStorage.getItem('userTypeId');
    const storedRequiresCustomerProfile = localStorage.getItem('requiresCustomerProfile') === 'true';

    if (storedRequiresCustomerProfile && storedTypeId === '3' && storedRole === 'Customer') {
      return '/complete-profile';
    }
    if (storedRole === 'Admin') return '/admin-dashboard';
    if (storedRole === 'Clerk') return '/employee-dashboard';
    if (storedTypeId === '3' && storedRole === 'Customer') return '/customer-dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-white">
      {isAuthenticated && !(location.pathname === '/complete-profile' && requiresCustomerProfile) && (
        <GlobalNavbar
          onLogout={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          onToggleDark={() => { }} // Provide a dummy or actual handler
          dark={false} // Provide a boolean value or state
        />
      )}
      {showSidebar && <Sidebar userRole={storedRole || undefined} onPinChange={setSidebarPinned} />}
    <div className={`flex-1 p-4 relative z-10 transition-all duration-300 ${showSidebar && storedRole === 'Admin' ? (sidebarPinned ? 'pl-64' : 'pl-12') : ''}`}>
        {isAuthenticated && userTypeId !== '3'}
        <Routes>
          <Route path="/register" element={<RegisterForm onLogin={handleLogin} />} />
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route
            path="/admin-dashboard"
            element={
              <RequireRole allowedRoles={['Admin']}>
                <AdminDashboard isPinned={sidebarPinned} />
              </RequireRole>
            }
          />
          <Route
            path="/employee-dashboard"
            element={
              <RequireRole allowedRoles={['Clerk']}>
                <EmployeeDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/customer-dashboard"
            element={
              <RequireRole allowedRoles={['Customer']}>
                <CustomerDashboard />
              </RequireRole>
            }
          />
          <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
          <Route
            path="/complete-profile"
            element={
              <RequireRole allowedRoles={['Customer']}>
                <CustomerProfileCompletion />
              </RequireRole>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/paymentpage" element={<PaymentPage />} />
          <Route path="/customerList" element={<CustomerList />} />
          <Route path="/EmployeeList" element={<EmployeeList />} />
          <Route path="/BranchList" element={<BranchList />} />
          <Route path="/BillList" element={<BillList />} />
          <Route
            path="/Customers/create"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer']}>
                <CustomerForm />
              </RequireRole>
            }
          />
          <Route
            path="/employees/create"
            element={
              <RequireRole allowedRoles={['Admin']}>
                <EmployeeForm />
              </RequireRole>
            }
          />
          <Route
            path="/billform"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer']}>
                <BillForm onSave={() => { }} />
              </RequireRole>
            }
          />
          <Route
            path="/branch"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk']}>
                <BranchForm />
              </RequireRole>
            }
          />
          <Route
            path="/demandForm"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk']}>
                <DemandForm />
              </RequireRole>
            }
          />
          <Route
            path="/demand-list"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk']}>
                <DemandList />
              </RequireRole>
            }
          />
          <Route
            path="/paymentmethodform"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk']}>
                <PaymentMethodForm />
              </RequireRole>
            }
          />
          <Route
            path="/paymentmethodlist"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk']}>
                <PaymentMethodList />
              </RequireRole>
            }
          />
          <Route
            path="/PaymentForm"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer']}>
                <PaymentForm />
              </RequireRole>
            }
          />
          <Route
            path="/payment-list"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer']}>
                <PaymentList />
              </RequireRole>
            }
          />
          <Route
            path="*"
            element={
              <div className="text-center mt-20 text-red-500 text-2xl">
                404 - Page Not Found
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <DialogProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="toast-container"
      />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </DialogProvider>
  );
}

export default App;