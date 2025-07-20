import { useState, useEffect, useRef } from 'react';
import { FiSun, FiMoon, FiClock, FiCalendar, FiLogOut } from 'react-icons/fi';
import { HiOutlineLightBulb } from 'react-icons/hi';
import { useAuth } from './AuthContext';

interface GlobalNavbarProps {
  onToggleDark: () => void;
  dark: boolean;
  onLogout: () => void;
}

const GlobalNavbar: React.FC<GlobalNavbarProps> = ({ onToggleDark, dark, onLogout }) => {
  const { userName, userEmail, userRole } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center space-x-3">
        <HiOutlineLightBulb className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
        <p className="text-gray-800 dark:text-white text-lg font-semibold">e-Governance</p>
      </div>

      <div className="flex items-center space-x-6">
        <button
          onClick={onToggleDark}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <FiSun className="w-5 h-5 text-yellow-400" /> : <FiMoon className="w-5 h-5 text-gray-600" />}
        </button>

        <div className="text-right text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center">
            <FiClock className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
            {formatTime(currentTime)}
          </div>
          <div className="flex items-center text-xs mt-1">
            <FiCalendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
            {formatDate(currentTime)}
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold hover:opacity-90 transition-all"
          >
            {userInitial}
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-gray-800 dark:text-gray-100 font-semibold">{userName}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{userEmail}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{userRole}</p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className="text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
          title="Logout"
          aria-label="Logout"
        >
          <FiLogOut className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
};

export default GlobalNavbar;
