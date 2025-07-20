import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import 'react-toastify/dist/ReactToastify.css';

interface LoginFormProps {
  onLogin: (userTypeId: number, token: string, role: string, requiresCustomerProfile: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5008/api/UserAuth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();
      console.log('Login response:', result);

      const { token, role, userTypeId, requiresCustomerProfile } = result;

      if (res.ok && token && role && userTypeId !== undefined && userTypeId !== null) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userTypeId', String(userTypeId));
        localStorage.setItem('requiresCustomerProfile', String(requiresCustomerProfile || false));

        // Extract name from JWT token
        let userName = username;
        try {
          const decoded: any = jwtDecode(token);
          userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || username || 'User';
        } catch {
          console.error('Failed to decode JWT token');
        }
        localStorage.setItem('userName', userName);

        // Display role-specific toast notification
        switch (role) {
          case 'Admin':
            toast.success(`Welcome, ${userName}!\nBelow is your control panel.`, {
              autoClose: 3000,
              style: { whiteSpace: 'pre-line' },
            });
            break;
          case 'Clerk':
            toast.success(`Hello, ${userName}!\nBelow is your dashboard.`, {
              autoClose: 3000,
              style: { whiteSpace: 'pre-line' },
            });
            break;
          case 'Customer':
            toast.success(
              requiresCustomerProfile
                ? `Welcome, ${userName}!\nPlease complete your profile to continue.`
                : `Welcome, ${userName}!\nPlease proceed with your Bills.`,
              {
                autoClose: 3000,
                style: { whiteSpace: 'pre-line' },
              }
            );
            break;
          default:
            toast.success(`Welcome, ${userName}!`, { autoClose: 3000 });
        }

        onLogin(userTypeId, token, role, requiresCustomerProfile || false);

        if (role === 'Admin') {
          navigate('/admin-dashboard');
        } else if (role === 'Clerk') {
          navigate('/employee-dashboard');
        } else if (userTypeId === 3) {
          navigate(requiresCustomerProfile ? '/complete-profile' : '/customer-dashboard');
        } else {
          navigate('/unauthorized');
        }
      } else {
        const errorMessage = result.message || 'Login failed';
        if (!token) console.error('No token received');
        if (!role) console.error('No role received');
        if (userTypeId === undefined || userTypeId === null) console.error('No userTypeId received');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white">
      <div className="max-w-lg w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
            <FiKey className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              disabled={isLoading}
              className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'username' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
            />
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              disabled={isLoading}
              className={`w-full pr-10 px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'password' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center text-sm text-gray-600">
              <input type="checkbox" className="mr-2 rounded border-gray-300" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !username || !password}
            className="w-full mt-6 py-3 bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>

        <div className="text-center mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;