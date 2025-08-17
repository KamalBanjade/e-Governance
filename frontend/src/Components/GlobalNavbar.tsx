import { useState, useEffect } from 'react';
import { FiClock } from 'react-icons/fi';
import { HiOutlineLightBulb } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../utility/auth'; // Adjust path as needed

const API_BASE_URL = 'http://localhost:5008/api';

interface GlobalNavbarProps {
  userRole?: string | null;
  onLogout?: () => void;
  onToggleDark?: () => void;
  dark?: boolean;
}

interface NepaliDate {
  year: number;
  month: string;
  day: number;
  formatted: string;
}

const GlobalNavbar: React.FC<GlobalNavbarProps> = ({ userRole }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentNepali, setCurrentNepali] = useState<NepaliDate | null>(null);
  const [isLoadingDate, setIsLoadingDate] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCurrentNepaliDate = async () => {
      setIsLoadingDate(true);
      try {
        const token = getAuthToken();
        if (!token) {
          console.log('No auth token available, skipping Nepali date fetch');
          setIsLoadingDate(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/Bills/current-nepali-date`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch Nepali date');
        }
        
        const data = await res.json();
        setCurrentNepali({
          year: data.year,
          month: data.month.split(' ')[0], // Extract just the month name
          day: data.day,
          formatted: data.formatted
        });
      } catch (error) {
        console.error('Error fetching Nepali date:', error);
        // Fallback: Don't show Nepali date if API fails
        setCurrentNepali(null);
      } finally {
        setIsLoadingDate(false);
      }
    };

    fetchCurrentNepaliDate();
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatEnglishDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Dynamic color mapping for roles
  const roleColors: Record<string, { glow: string; title: string; main: string; sub: string; icon: string }> = {
    customer: {
      glow: 'from-green-300 to-green-600',
      title: 'text-green-600',
      main: 'text-gray-900',
      sub: 'text-gray-700',
      icon: 'text-gray-700',
    },
    admin: {
      glow: 'from-blue-500 to-indigo-700',
      title: 'text-blue-600',
      main: 'text-gray-800',
      sub: 'text-gray-600',
      icon: 'text-gray-600',
    },
    manager: {
      glow: 'from-purple-400 to-purple-700',
      title: 'text-purple-600',
      main: 'text-gray-900',
      sub: 'text-gray-700',
      icon: 'text-gray-700',
    },
    clerk: {
      glow: 'from-orange-400 to-orange-700',
      title: 'text-orange-600',
      main: 'text-gray-900',
      sub: 'text-gray-700',
      icon: 'text-gray-700',
    },
  };

  const roleKey = userRole?.toLowerCase() || 'default';
  const colors = roleColors[roleKey] || {
    glow: 'from-gray-400 to-gray-700',
    title: 'text-gray-600',
    main: 'text-gray-800',
    sub: 'text-gray-600',
    icon: 'text-gray-600',
  };

  return (
    <nav
      className="sticky top-0 z-50 flex justify-between items-center px-8 py-4 shadow-lg backdrop-blur-md border-b border-white/20"
      style={{
        background: `rgba(255, 255, 255, 0.08)`,
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
      }}
    >
      {/* Logo / Branding */}
      <div
        className="flex items-center space-x-3 cursor-pointer group transition-transform duration-200 hover:scale-105"
        onClick={() => {
          if (userRole) {
            navigate(`/${userRole.toLowerCase().replace(/\s+/g, '-')}-dashboard`);
          } else {
            navigate('/');
          }
        }}
      >
        <div className="relative">
          <div
            className={`absolute -inset-3 rounded-full bg-gradient-to-r ${colors.glow} blur-xl opacity-50 group-hover:opacity-70 transition`}
          />
          <HiOutlineLightBulb className="w-9 h-9 text-yellow-500 relative z-10" />
        </div>
      </div>

      {/* Date & Time */}
      <div className={`flex flex-col items-end ${colors.main} text-sm`}>
        {/* Current Time */}
        <div className="flex items-center font-semibold">
          <FiClock className={`w-4 h-4 mr-2 opacity-80 ${colors.icon}`} />
          {formatTime(currentTime)}
        </div>
        
        {/* Nepali Date */}
        <div className={`flex items-center mt-1 text-xs ${colors.sub}`}>
          {/* <FiCalendar className="w-4 h-4 mr-2" /> */}
          {isLoadingDate ? (
            <span className="text-gray-400 italic">Loading...</span>
          ) : currentNepali ? (
            <div className="flex flex-col items-end">
              <span className="flex items-center font-semibold  ">
                {currentNepali.formatted}
              </span>
              <span className="text-sm font-semibold ">
                {formatEnglishDate(currentTime)}
              </span>
            </div>
          ) : (
            <span className="italic">
              {formatEnglishDate(currentTime)}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GlobalNavbar;