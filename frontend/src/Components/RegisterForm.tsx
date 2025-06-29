import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RegisterForm = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        password: '',
        name: '',
        address: '',
        dob: '',
        email: '',
        userTypeId: 3
    });

    const [errors, setErrors] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                toast.success('Account created successfully! Redirecting to login...');
                setForm({ username: '', password: '', name: '', address: '', dob: '', email: '', userTypeId: 3 });
                setTimeout(() => navigate('/login'), 1000);
            } else {
                if (result.errors) {
                    const errorMessages: string[] = [];
                    Object.keys(result.errors).forEach(key => {
                        result.errors[key].forEach((error: string) => errorMessages.push(`${key}: ${error}`));
                    });
                    setErrors(errorMessages);
                    if (errorMessages.length > 0) toast.error(errorMessages[0]);
                } else {
                    const errorMessage = result.message || 'Registration failed';
                    setErrors([errorMessage]);
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            const errorMessage = 'Network error occurred. Please check your connection.';
            setErrors([errorMessage]);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
            <div className="max-w-lg w-full space-y-8">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                    </div>

                    {errors.length > 0 && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                            <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                {errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="space-y-5">
                        <InputField label="Username" name="username" value={form.username} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isLoading} />
                        <InputField label="Password" name="password" type="password" value={form.password} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isLoading} />
                        <InputField label="Full Name" name="name" value={form.name} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isLoading} />
                        <InputField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isLoading} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Address (optional)" name="address" value={form.address} onChange={handleChange} onKeyPress={handleKeyPress} disabled={isLoading} />
                            <InputField label="Date of Birth (optional)" name="dob" type="date" value={form.dob} onChange={handleChange} disabled={isLoading} />
                        </div>

                    </div>

                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-200 ease-in-out disabled:opacity-50"
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, name, value, onChange, onKeyPress, disabled = false, type = 'text' }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onKeyPress={onKeyPress}
            disabled={disabled}
            className="w-full pl-3 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out disabled:opacity-50"
        />
    </div>
);

export default RegisterForm;