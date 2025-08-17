import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify'; // Add this import

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  message: string;
  requiresCustomerProfile: boolean;
  role: string;
  token: string;
  userTypeId: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  
  userRole: string;
  userTypeId: string;
  userName: string;
  userEmail: string;
  customerId: string;
  requiresCustomerProfile: boolean;
  handleLogin: (loginResponse: LoginResponse) => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userTypeId, setUserTypeId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [requiresCustomerProfile, setRequiresCustomerProfile] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isTokenValid = (token: string | null): boolean => {
    if (!token) {
      console.log('No token found in localStorage');
      return false;
    }
    try {
      const decoded: any = jwtDecode(token);
      const isValid = decoded.exp * 1000 > Date.now();
      return isValid;
    } catch (error) {
      console.error('Token decoding error:', error);
      return false;
    }
  };

  // Updated handleLogin to accept the login response object
  const handleLogin = (loginResponse: LoginResponse) => {
  
    const { token, role, userTypeId, requiresCustomerProfile: requiresProfile } = loginResponse;
    
    // Store in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userTypeId', userTypeId.toString());
    localStorage.setItem('requiresCustomerProfile', requiresProfile.toString());

    try {
      const decoded: any = jwtDecode(token);
      
      // Extract user information from JWT claims
      const name = decoded.name || 
                   decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                   decoded.username || 'User';
      const email = decoded.email || 
                    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
                    'user@example.com';
      const customerId = decoded.customerId || '0';

      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('customerId', customerId);

      // Update state
      setUserName(name);
      setUserEmail(email);
      setCustomerId(customerId);
      setRequiresCustomerProfile(requiresProfile);
      setIsAuthenticated(true);
      setUserRole(role);
      setUserTypeId(userTypeId.toString());

    } catch (error) {
      console.error('Error decoding token during login:', error);
      
      // Fallback values
      localStorage.setItem('userName', 'User');
      localStorage.setItem('userEmail', 'user@example.com');
      localStorage.setItem('customerId', '0');

      setUserName('User');
      setUserEmail('user@example.com');
      setCustomerId('0');
      setRequiresCustomerProfile(requiresProfile);
      setIsAuthenticated(true);
      setUserRole(role);
      setUserTypeId(userTypeId.toString());
    }
  };

  const handleLogout = () => {
    console.log('Logout initiated');
    
    // Clear localStorage immediately
    localStorage.clear();
    
    // Reset all auth state immediately and synchronously
    setIsAuthenticated(false);
    setUserRole('');
    setUserTypeId('');
    setUserName('');
    setUserEmail('');
    setCustomerId('');
    setRequiresCustomerProfile(false);

    // Remove dark mode class
    document.documentElement.classList.remove('dark');
    
    // Show success toast
    toast.success('Successfully logged out!');
    
    console.log('Logout completed, redirecting to login');
    
    // Force immediate redirect to login page
    window.location.replace('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    const typeId = localStorage.getItem('userTypeId');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    const customerId = localStorage.getItem('customerId');
    const requiresProfile = localStorage.getItem('requiresCustomerProfile') === 'true';

    if (token && role) {
      if (isTokenValid(token)) {
        setIsAuthenticated(true);
        setUserRole(role);
        setUserTypeId(typeId || '');
        setUserName(name || 'User');
        setUserEmail(email || 'user@example.com');
        setCustomerId(customerId || '0');
        setRequiresCustomerProfile(requiresProfile);
      } else {
        // Only show session expired message when token is actually expired during auth check
        toast.error('Session expired. Please login again.');
        handleLogout();
      }
    } else {
      console.log('No token or role found, user not authenticated');
    }
    setIsCheckingAuth(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userTypeId,
        userName,
        userEmail,
        customerId,
        requiresCustomerProfile,
        handleLogin,
        handleLogout
      }}
    >
      {isCheckingAuth ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};