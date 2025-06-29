// App.tsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import CustomerForm from './Components/CustomerForm';
import CustomerList from './Components/CustomerList';
import EmployeeForm from './Components/EmployeeForm';
import EmployeeList from './Components/EmployeeList';
import LoginForm from './Components/LoginForm';
import RegisterForm from './Components/RegisterForm';
import ForgotPasswordForm from './Components/ForgotPasswordForm';
import ResetPasswordForm from './Components/ResetPasswordForm';
import Unauthorized from './utility/Unauthorized';

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <div className="p-4 bg-gray-100 min-h-screen">
          <nav className="mb-4 flex gap-4">
            <Link to="/Customers/create" className="text-blue-600 hover:text-blue-800 transition-colors">New Customer</Link>
            <Link to="/Customers" className="text-blue-600 hover:text-blue-800 transition-colors">Customer List</Link>
            <Link to="/employees/create" className="text-blue-600 hover:text-blue-800 transition-colors">New Employee</Link>
            <Link to="/employees" className="text-blue-600 hover:text-blue-800 transition-colors">Employee List</Link>
            <Link to="/login" className="text-blue-600 hover:text-blue-800 transition-colors">Login</Link>
            <Link to="/register" className="text-blue-600 hover:text-blue-800 transition-colors">Register</Link>
          </nav>

          <Routes>
            <Route path="/Customers/create" element={<CustomerForm />} />
            <Route path="/Customers" element={<CustomerList />} />
            <Route path="/employees/create" element={<EmployeeForm />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path='/login' element={<LoginForm />} />
            <Route path='/register' element={<RegisterForm />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/reset-password" element={<ResetPasswordForm />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
