import { useState, useEffect } from 'react';
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
import Dashboard from './Dashboards/DashBoard';
import CustomerDashboard from './Dashboards/CustomerDashboard';
import EmployeeDashboard from './Dashboards/ClerkDashboard';
import CustomerProfileCompletion from './Components/CustomerProfileCompletion';
import PaymentPage from './Components/PaymentPage';
import EmployeeList from './Components/EmployeeList';
import BranchList from './Components/BranchList';
import BillList from './Components/BillList';
import GlobalNavbar from './Components/GlobalNavbar';
import PaymentList from './Components/PaymentList';
import Sidebar from './Components/SideBar';
import MyBills from './Components/MyBills';
import Profile from './Components/Profile';
import MainContentLayout from './Components/MainContentLayout';
import SupportCenter from './Components/SupportCenter';
import { motion } from 'framer-motion';
import BranchAdminList from './Components/BranchAdminList';
import BranchAdminForm from './Components/BranchAdminForm';
import ErrorBoundary from './Components/ErrorBoundary';

const AppContent = () => {
  const { isAuthenticated, requiresCustomerProfile, handleLogin, handleLogout, userTypeId } = useAuth();
  const location = useLocation();
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  }, [sidebarPinned]);

  const noSidebarRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/complete-profile',
    '/unauthorized',
  ];

  const storedRole = localStorage.getItem('userRole');
  const storedTypeId = localStorage.getItem('userTypeId');

  const showSidebar = isAuthenticated && !noSidebarRoutes.includes(location.pathname);

  const getDefaultRoute = () => {
    const storedRequiresCustomerProfile = localStorage.getItem('requiresCustomerProfile') === 'true';

    if (storedRequiresCustomerProfile && storedTypeId === '3' && storedRole === 'Customer') {
      return '/complete-profile';
    }
    if (storedRole === 'Admin' || storedRole === 'BranchAdmin') return '/dashboard';
    if (storedRole === 'Clerk') return '/clerk-dashboard';
    if (storedTypeId === '3' && storedRole === 'Customer') return '/customer-dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-white">
      {isAuthenticated && !(location.pathname === '/complete-profile' && requiresCustomerProfile) && (
        <GlobalNavbar
          userRole={storedRole}
          onLogout={handleLogout}
          onToggleDark={() => {}}
          dark={false}
        />
      )}
      {showSidebar && <Sidebar userRole={storedRole || undefined} onPinChange={setSidebarPinned} />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`transition-all duration-300 relative z-10 p-4`}
        style={{
          marginLeft: sidebarPinned ? 0 : 30,
        }}
      >
        <Routes>
          <Route path="/register" element={<RegisterForm onLogin={handleLogin} />} />
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route
            path="/dashboard"
            element={
              <RequireRole allowedRoles={['Admin', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    {userTypeId ? (
                      <Dashboard userTypeId={parseInt(userTypeId)} />
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/clerk-dashboard"
            element={
              <RequireRole allowedRoles={['Clerk']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <EmployeeDashboard />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/customer-dashboard"
            element={
              <RequireRole allowedRoles={['Customer']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <CustomerDashboard />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
          <Route
            path="/complete-profile"
            element={
              <RequireRole allowedRoles={['Customer']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <CustomerProfileCompletion />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/paymentpage"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <PaymentPage />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/customerList"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <CustomerList />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/EmployeeList"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <EmployeeList />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/BranchList"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <BranchList />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/BranchAdminList"
            element={
              <RequireRole allowedRoles={['Admin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <BranchAdminList />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/BillList"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <BillList />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/Profile"
            element={
              <MainContentLayout isPinned={sidebarPinned}>
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              </MainContentLayout>
            }
          />
          <Route
            path="/Customers/create"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer','BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <CustomerForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/employees/create"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <EmployeeForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/branch-admins/create"
            element={
              <RequireRole allowedRoles={['Admin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <BranchAdminForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/billform"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer','BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <BillForm onSave={() => {}} />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/branch"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <BranchForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/my-bills"
            element={
              <RequireRole allowedRoles={['Customer']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <MyBills />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/demandForm"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <DemandForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/demand-list"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <DemandList />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/paymentmethodform"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <PaymentMethodForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/paymentmethodlist"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <PaymentMethodList />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/PaymentForm"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <PaymentForm />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/payment-list"
            element={
              <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <PaymentList />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="/customer-support"
            element={
              <RequireRole allowedRoles={['Customer', 'Admin', 'Clerk', 'BranchAdmin']}>
                <MainContentLayout isPinned={sidebarPinned}>
                  <ErrorBoundary>
                    <SupportCenter />
                  </ErrorBoundary>
                </MainContentLayout>
              </RequireRole>
            }
          />
          <Route
            path="*"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mt-20 text-red-500 text-2xl"
              >
                404 - Page Not Found
              </motion.div>
            }
          />
        </Routes>
      </motion.div>
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