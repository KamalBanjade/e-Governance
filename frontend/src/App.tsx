import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { FiLogOut } from 'react-icons/fi';

import 'react-toastify/dist/ReactToastify.css';

import CustomerForm from './Components/CustomerForm';
import EmployeeForm from './Components/EmployeeForm';
import LoginForm from './Components/LoginForm';
import RegisterForm from './Components/RegisterForm';
import ForgotPasswordForm from './Components/ForgotPasswordForm';
import ResetPasswordForm from './Components/ResetPasswordForm';
import Unauthorized from './utility/Unauthorized';
import RequireRole from './Components/RequireRole';
import BillForm from './Components/BillForm';
import BranchForm from './Components/BranchForm';
import DemandManagement from './Components/DemandManagement';
import PaymentMethod from './Components/PaymentMethod';
import Payments from './Components/Payments';
import AdminDashboard from './Dashboards/AdminDashboard';
import CustomerDashboard from './Dashboards/CustomerDashboard';
import EmployeeDashboard from './Dashboards/EmployeeDashboard';
import GoBackButton from './Components/GoBackButton';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setUserRole] = useState('');
  const [, setUserTypeId] = useState('');

  const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userTypeId');
    setIsAuthenticated(false);
    setUserRole('');
    setUserTypeId('');
  };

  const handleLogin = (userTypeId: number, token: string, role: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userTypeId', userTypeId.toString());
    setIsAuthenticated(true);
    setUserRole(role);
    setUserTypeId(userTypeId.toString());
  };

  const getDefaultRoute = () => {
    const storedRole = localStorage.getItem('userRole');
    const storedTypeId = localStorage.getItem('userTypeId');

    if (storedRole === 'Admin') return '/admin-dashboard';
    if (storedRole === 'Clerk') return '/employee-dashboard';
    if (storedTypeId === '3') return '/customer-dashboard';
    return '/login';
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    const typeId = localStorage.getItem('userTypeId');

    if (isTokenValid(token) && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserTypeId(typeId || '');
    } else {
      handleLogout();
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="text-center mt-20 text-gray-500 text-lg">Loading...</div>;
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <div className="p-4 bg-gray-100 min-h-screen relative">

          {/* ✅ Logout Button Only */}
          {isAuthenticated && (
            <div className="flex justify-between items-center mb-4">
              <div>
                <GoBackButton />
              </div>
              <button
                onClick={handleLogout}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Logout"
              >
                <FiLogOut className="w-6 h-6" />
              </button>
            </div>
          )}


          <Routes>
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? getDefaultRoute() : "/login"} replace />}
            />

            {/* Dashboards */}
            <Route
              path="/admin-dashboard"
              element={
                <RequireRole allowedRoles={['Admin']}>
                  <AdminDashboard />
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

            {/* Auth */}
            <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/reset-password" element={<ResetPasswordForm />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
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
              path="/demand"
              element={
                <RequireRole allowedRoles={['Admin', 'Clerk']}>
                  <DemandManagement />
                </RequireRole>
              }
            />
            <Route
              path="/paymentmethod"
              element={
                <RequireRole allowedRoles={['Admin', 'Clerk']}>
                  <PaymentMethod />
                </RequireRole>
              }
            />
            <Route
              path="/Payments"
              element={
                <RequireRole allowedRoles={['Admin', 'Clerk', 'Customer']}>
                  <Payments />
                </RequireRole>
              }
            />

            {/* 404 */}
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
      </Router>
    </>
  );
}

export default App;
