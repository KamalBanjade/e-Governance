// GlobalNavbar.tsx
import { useState, useEffect } from 'react';
import { FiSun, FiMoon, FiClock, FiCalendar, FiLogOut } from 'react-icons/fi';

interface GlobalNavbarProps {
  onToggleDark: () => void;
  dark: boolean;
  onLogout: () => void;
}

const GlobalNavbar: React.FC<GlobalNavbarProps> = ({ onToggleDark, dark, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex justify-between items-center px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div></div> {/* You can add a logo or app name if needed */}
      <div className="flex items-center space-x-4">
        <button onClick={onToggleDark} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          {dark ? <FiSun /> : <FiMoon />}
        </button>
        <div className="text-right text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center">
            <FiClock className="w-4 h-4 mr-1" />{formatTime(currentTime)}
          </div>
          <div className="flex items-center text-xs">
            <FiCalendar className="w-3 h-3 mr-1" />{formatDate(currentTime)}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-gray-600 hover:text-red-600 dark:text-gray-300"
          title="Logout"
        >
          <FiLogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default GlobalNavbar;
