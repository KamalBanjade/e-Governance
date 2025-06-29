import { useState } from 'react';
import { toast } from 'react-toastify';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.warning('Email is required');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('http://localhost:5008/api/UserAuth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Reset link sent to email');
      } else {
        toast.error(data.message || 'Failed to send reset link');
      }
    } catch {
      toast.error('Network error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full">
        <h2 className="text-2xl font-semibold text-center mb-4">Forgot Password</h2>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          disabled={isSending}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border rounded-md mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={isSending}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          {isSending ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
