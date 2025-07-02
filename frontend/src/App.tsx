import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import CustomerForm from './Components/CustomerForm';
// import CustomerList from './Components/CustomerList';
import EmployeeForm from './Components/EmployeeForm';
import EmployeeList from './Components/EmployeeList';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check for authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (token && role) {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle login
  const handleLogin = (userTypeId: number) => {
    const roleMap: { [key: number]: string } = {
      1: 'Admin',
      2: 'Employee',
      3: 'Customer',
    };
    const role = roleMap[userTypeId] || 'Customer';
    const token = 'session-token'; // Placeholder; use actual token if returned by API
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-blue-800 font-semibold underline'
      : 'text-blue-600 hover:text-blue-800 transition-colors';

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <div className="p-4 bg-gray-100 min-h-screen">
          {/* Show navigation only if authenticated */}
          {isAuthenticated && (
            <nav className="mb-6 flex gap-4 flex-wrap text-sm sm:text-base">
              <NavLink to="/Customers/create" className={navLinkClass}>New Customer</NavLink>
              <NavLink to="/billform" className={navLinkClass}>New Bill</NavLink>
              {/* <NavLink to="/Customers" className={navLinkClass}>Customer List</NavLink> */}
              <NavLink to="/employees/create" className={navLinkClass}>New Employee</NavLink>
              <NavLink to="/employees" className={navLinkClass}>Employee List</NavLink>
              <NavLink to="/branch" className={navLinkClass}>Add Branch</NavLink>
              <NavLink to="/demand" className={navLinkClass}>Add Demand</NavLink>
              <NavLink to="/paymentmethod" className={navLinkClass}>Payment Method</NavLink>
              <NavLink to="/Payments" className={navLinkClass}>Payments</NavLink>
              <button
                onClick={handleLogout}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Logout
              </button>
            </nav>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/Customers" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={
                <div className="max-w-auto mx-auto mt-10">
                  <LoginForm onLogin={handleLogin} />
                </div>
              }
            />

            <Route
              path="/register"
              element={
                <div className="max-w-auto mx-auto mt-10">
                  <RegisterForm />
                </div>
              }
            />


            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/reset-password" element={<ResetPasswordForm />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
            <Route
              path="/Customers/create"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <CustomerForm />
                </RequireRole>
              }
            />
            {/* <Route
              path="/Customers"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <CustomerList />
                </RequireRole>
              }
            /> */}
            <Route
              path="/employees/create"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <EmployeeForm />
                </RequireRole>
              }
            />
            <Route
              path="/employees"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <EmployeeList />
                </RequireRole>
              }
            />
            <Route
              path="/billform"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <BillForm onSave={() => { }} />
                </RequireRole>
              }
            />
            <Route
              path="/branch"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <BranchForm />
                </RequireRole>
              }
            />
            <Route
              path="/demand"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <DemandManagement />
                </RequireRole>
              }
            />
            <Route
              path="/paymentmethod"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <PaymentMethod />
                </RequireRole>
              }
            />
            <Route
              path="/Payments"
              element={
                <RequireRole allowedRoles={['Admin', 'Employee', 'Customer']}>
                  <Payments />
                </RequireRole>
              }
            />

            {/* 404 Fallback */}
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