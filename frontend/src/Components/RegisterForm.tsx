import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiEye, FiEyeOff, FiUser } from 'react-icons/fi';

const RegisterForm = ({ onLogin }: { onLogin: (userTypeId: number, token: string, role: string, requiresCustomerProfile: boolean) => void }) => {

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

    const [errors, setErrors] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

  const handleSubmit = async () => {
    setErrors([]);
    setIsLoading(true);
    
    try {
        const res = await fetch('http://localhost:5008/api/UserAuth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        
        const result = await res.json();
        
        if (res.ok) {
            const { token, role, userTypeId, requiresCustomerProfile } = result;
            
            if (requiresCustomerProfile && token && role && userTypeId) {
                // Store the auth data but don't call onLogin yet
                localStorage.setItem('authToken', token);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userTypeId', userTypeId.toString());
                localStorage.setItem('requiresCustomerProfile', 'true');
                
                toast.success('Account created successfully! Please complete your customer profile.');
                navigate('/complete-profile', { replace: true });
                
                // Call onLogin after navigation to set the auth state
                setTimeout(() => {
                    onLogin(userTypeId, token, role, requiresCustomerProfile);
                }, 100);
            } else {
                onLogin(userTypeId, token, role, false);
                toast.success('Account created successfully! Redirecting to login...');
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
        <div className="flex items-center justify-center bg-gradient-to-tr from-blue-100 to-white px-4 py-10">
            <div className="max-w-lg w-full bg-gradient-to-tr from-blue-200 to-white rounded-2xl shadow-lg p-8">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-xl mb-5 shadow-md animate-bounce">
                        <FiUser className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-semibold text-gray-800">Create Account</h2>
                    <p className="text-sm text-gray-600 mt-2">Step 1 of 2 - Basic Information</p>
                </div>

                {errors.length > 0 && (
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
                )}

                <div className="space-y-5">
                    <InputField
                        label="Username"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        focusedField={focusedField}
                        setFocusedField={setFocusedField}
                    />

                    <div className="relative">
                        <InputField
                            label="Password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={handleChange}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-12 text-gray-500 hover:text-gray-700"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <FiEyeOff className="w-5 h-5" />
                            ) : (
                                <FiEye className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    <InputField
                        label="Full Name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        focusedField={focusedField}
                        setFocusedField={setFocusedField}
                    />

                    <InputField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        focusedField={focusedField}
                        setFocusedField={setFocusedField}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Address"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />
                        <InputField
                            label="Date of Birth"
                            name="dob"
                            type="date"
                            value={form.dob}
                            onChange={handleChange}
                            disabled={isLoading}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account & Continue'}
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                        >
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    focusedField: string | null;
    setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    name,
    value,
    onChange,
    onKeyPress,
    disabled = false,
    type = 'text',
    setFocusedField,
}) => {
    return (
        <div>
            <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 mb-2"
            >
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onKeyPress={onKeyPress}
                disabled={disabled}
                onFocus={() => setFocusedField(name)}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-3 pr-4 py-3 border border-gray-300 rounded-xl transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50`}
                placeholder={label}
                autoComplete="off"
            />
        </div>
    );
};

export default RegisterForm;