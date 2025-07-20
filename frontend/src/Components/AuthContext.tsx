import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';


interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string;
  userTypeId: string;
  userName: string;
  userEmail: string; // ✅ added
  requiresCustomerProfile: boolean;
  handleLogin: (userTypeId: number, token: string, role: string, requiresCustomerProfile: boolean) => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userTypeId, setUserTypeId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState(''); // ✅ added
  const [requiresCustomerProfile, setRequiresCustomerProfile] = useState(false);

  const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  const handleLogin = (userTypeId: number, token: string, role: string, requiresCustomerProfile: boolean) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userTypeId', userTypeId.toString());
    localStorage.setItem('requiresCustomerProfile', requiresCustomerProfile.toString());

    try {
      const decoded: any = jwtDecode(token);
      const name = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || decoded.username || 'User';
      const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email || 'user@example.com';

      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', email);

      setUserName(name);
      setUserEmail(email);
    } catch {
      localStorage.setItem('userName', 'User');
      localStorage.setItem('userEmail', 'user@example.com');

      setUserName('User');
      setUserEmail('user@example.com');
    }

    setIsAuthenticated(true);
    setUserRole(role);
    setUserTypeId(userTypeId.toString());
    setRequiresCustomerProfile(requiresCustomerProfile);
  };

  const handleLogout = () => {
    // Clear all local storage first
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userTypeId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('requiresCustomerProfile');
    localStorage.removeItem('darkMode');

    // Reset all states
    setIsAuthenticated(false);
    setUserRole('');
    setUserTypeId('');
    setUserName('');
    setUserEmail('');
    setRequiresCustomerProfile(false);

    document.documentElement.classList.remove('dark');
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    const typeId = localStorage.getItem('userTypeId');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail'); // ✅ added
    const requiresProfile = localStorage.getItem('requiresCustomerProfile') === 'true';

    if (isTokenValid(token) && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserTypeId(typeId || '');
      setUserName(name || 'User');
      setUserEmail(email || 'user@example.com'); // ✅ added
      setRequiresCustomerProfile(requiresProfile);
    } else {
      handleLogout();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userTypeId,
        userName,
        userEmail, // ✅ added
        requiresCustomerProfile,
        handleLogin,
        handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};