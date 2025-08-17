import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiEye, FiEyeOff, FiUser } from 'react-icons/fi';

interface LoginResponse {
  message: string;
  requiresCustomerProfile: boolean;
  role: string;
  token: string;
  userTypeId: number;
}

interface RegisterFormProps {
  onLogin: (loginResponse: LoginResponse) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    address: '',
    dob: '',
    email: '',
    userTypeId: 3,
  });
  const [, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSubmit = async () => {
    setErrors([]);
    setIsLoading(true);

    // Validate name field
    if (!form.name || form.name.trim().length < 2) {
      setErrors(['Name must be at least 2 characters long']);
      setIsLoading(false);
      toast.error('Name must be at least 2 characters long');
      return;
    }

    try {
      const res = await fetch('http://localhost:5008/api/UserAuth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      console.log('Register response:', result);

      if (res.ok) {
        const { token, role, userTypeId, requiresCustomerProfile } = result;

        if (requiresCustomerProfile && token && role && userTypeId) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userRole', role);
          localStorage.setItem('userTypeId', String(userTypeId));
          localStorage.setItem('requiresCustomerProfile', 'true');
          localStorage.setItem('userName', form.name.trim());
          toast.success(
            `Welcome, ${form.name.trim()}!\nPlease complete your profile to continue.`,
            {
              autoClose: 3000,
              style: { whiteSpace: 'pre-line' },
            }
          );
          navigate('/complete-profile', { replace: true });
          setTimeout(() => {
            onLogin(result);
          }, 100);
        } else {
          localStorage.setItem('userName', form.name.trim());
          toast.success(`Welcome, ${form.name.trim()}!\nPlease proceed with your Bills.`, {
            autoClose: 3000,
            style: { whiteSpace: 'pre-line' },
          });
          onLogin({
            message: result.message || 'Registration successful',
            requiresCustomerProfile: false,
            role: result.role,
            token: result.token,
            userTypeId: result.userTypeId
          });
          setTimeout(() => navigate('/login', { replace: true }), 1000);
        }

        setForm({
          username: '',
          password: '',
          name: '',
          address: '',
          dob: '',
          email: '',
          userTypeId: 3,
        });
      } else {
        if (result.errors) {
          const errorMessages: string[] = [];
          Object.keys(result.errors).forEach((key) => {
            result.errors[key].forEach((error: string) =>
              errorMessages.push(`${key}: ${error}`)
            );
          });
          setErrors(errorMessages);
          if (errorMessages.length > 0) toast.error(errorMessages[0]);
        } else {
          const errorMessage = result.message || 'Registration failed';
          setErrors([errorMessage]);
          toast.error(errorMessage);
        }
      }
    } catch {
      const errorMessage = 'Network error occurred. Please check your connection.';
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white">
      <div className="max-w-2xl w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
            <FiUser className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Create Account</h2>
          <p className="text-sm text-gray-500">Step 1 of 2 - Basic Information</p>
        </div>
        {/* {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              Please fix the following errors:
            </h4>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )} */}

        <div className="space-y-6">
          <div className="relative">
            <label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'username' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
              required
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pr-10 px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'password' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} diabled:opacity-50`}
              required
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

          <div className="relative">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'name' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
              required
            />
          </div>

          <div className="relative">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'email' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2-4">
            <div className="relative">
              <label htmlFor="address" className="text-sm font-medium text-gray-700">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'address' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
                required
              />
            </div>
            <div className="relative">
              <label htmlFor="dob" className="text-sm font-medium text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                value={form.dob}
                onChange={handleChange}
                disabled={isLoading}
                onFocus={() => setFocusedField('dob')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-0 py-3 text-gray-800 placeholder-gray-400 bg-transparent border-0 border-b-2 transition duration-200 focus:outline-none focus:ring-0 ${focusedField === 'dob' ? 'border-blue-600' : 'border-gray-300 hover:border-blue-400'} disabled:opacity-50`}
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-6 py-3 bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account & Continue'
            )}
          </button>
        </div>

        <div className="text-center mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;