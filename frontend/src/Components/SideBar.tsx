import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  FiUsers,
  FiHome,
  FiFileText,
  FiDollarSign,
  FiMapPin,
  FiBarChart2,
  FiCreditCard,
  FiHelpCircle,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiUser,
  FiBell,
  FiHeadphones,
  FiList,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

type SidebarProps = {
  onPinChange?: (isPinned: boolean) => void;
  userRole?: string;
};

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path: string;
}

const Sidebar = ({ onPinChange, userRole }: SidebarProps) => {
  const { userName, userEmail, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load saved state from localStorage, default to true if nothing is stored
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebarPinned");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onPinChange?.(isPinned);
    localStorage.setItem("sidebarPinned", JSON.stringify(isPinned));
  }, [isPinned, onPinChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePinned = () => {
    setIsPinned((prev) => !prev);
    setShowUserDropdown(false);
  };

  if (!userRole) {
    console.log('No userRole provided, hiding sidebar');
    return null;
  }

  // Define menu items based on user role
  const getMenuItems = (): MenuItem[] => {
    switch (userRole) {
      case 'Admin':
        return [
          { title: 'Dashboard', icon: FiHome, path: '/dashboard' },
          { title: 'Admin', icon: FiUsers, path: '/BranchAdminList' },
          { title: 'Employee', icon: FiUsers, path: '/EmployeeList' },
          { title: 'Customer', icon: FiUsers, path: '/customerList' },
          { title: 'Branches', icon: FiMapPin, path: '/BranchList' },
          { title: 'Bill', icon: FiFileText, path: '/BillList' },
          { title: 'Add Demand', icon: FiBarChart2, path: '/demand-list' },
          { title: 'Payment Method', icon: FiCreditCard, path: '/paymentmethodlist' },
          { title: 'Payments', icon: FiDollarSign, path: '/payment-list' },
        ];
      case 'BranchAdmin':
        return [
          { title: 'Dashboard', icon: FiHome, path: '/dashboard' },
          { title: 'Employee', icon: FiUsers, path: '/EmployeeList' },
          { title: 'Customer', icon: FiUsers, path: '/customerList' },
          { title: 'Bill', icon: FiFileText, path: '/BillList' },
          { title: 'Payments', icon: FiDollarSign, path: '/payment-list' },
        ];
      case 'Customer':
        return [
          { title: 'Dashboard', icon: FiHome, path: '/customer-dashboard' },
          { title: 'My Bills', icon: FiFileText, path: '/my-bills' },
          { title: 'My Profile', icon: FiUser, path: '/Profile' },
          { title: 'My Payments', icon: FiDollarSign, path: '/payment-list' },
          { title: 'Notifications', icon: FiBell, path: '/notifications' },
        ];
      case 'Clerk':
        return [
          { title: 'Dashboard', icon: FiHome, path: '/clerk-dashboard' },
          { title: 'My Profile', icon: FiUser, path: '/Profile' },
          { title: 'Bill', icon: FiFileText, path: '/Billform' },
          { title: 'BillList', icon: FiList, path: '/BillList' },
        ];
      default:
        return [];
    }
  };

  // Get footer items based on user role
  const getFooterItems = (): MenuItem[] => {
    if (userRole === 'Admin') {
      return [
        { title: 'Support Center', icon: FiHeadphones, path: '/customer-support' },
        { title: 'Get Help', icon: FiHelpCircle, path: '/help' },
      ];
    }
    return [
      { title: 'Support Center', icon: FiHeadphones, path: '/customer-support' },
    ];
  };

 const getPanelTitle = (): string => {
    switch (userRole) {
      case 'Admin':
        return 'Admin Panel';
      case 'BranchAdmin':
        return 'Branch Admin Panel';
      case 'Customer':
        return 'Customer Portal';
      case 'Clerk':
        return 'Clerk Panel';
      default:
        return 'Dashboard';
    }
  };

  // Get theme colors based on user role
  const getThemeColors = () => {
    switch (userRole) {
      case 'Admin':
        return {
          primary: 'blue',
          headerBg: 'bg-gray-50',
          titleColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          activeBg: 'bg-blue-50',
          activeText: 'text-blue-700',
          hoverBg: 'hover:bg-blue-50',
          hoverText: 'hover:text-blue-700',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          userBg: 'bg-blue-50',
          userIcon: 'bg-blue-600',
          footerHoverBg: 'hover:bg-blue-100',
          footerHoverText: 'hover:text-blue-800',
        };
      case 'BranchAdmin':
        return {
          primary: 'indigo',
          headerBg: 'bg-indigo-50',
          titleColor: 'text-indigo-700',
          iconColor: 'text-indigo-500',
          activeBg: 'bg-indigo-50',
          activeText: 'text-indigo-700',
          hoverBg: 'hover:bg-indigo-50',
          hoverText: 'hover:text-indigo-700',
          buttonBg: 'bg-indigo-600',
          buttonHover: 'hover:bg-indigo-700',
          userBg: 'bg-indigo-50',
          userIcon: 'bg-indigo-600',
          footerHoverBg: 'hover:bg-indigo-100',
          footerHoverText: 'hover:text-indigo-800',
        };
      case 'Customer':
        return {
          primary: 'green',
          headerBg: 'bg-green-50',
          titleColor: 'text-green-700',
          iconColor: 'text-green-500',
          activeBg: 'bg-green-50',
          activeText: 'text-green-700',
          hoverBg: 'hover:bg-green-50',
          hoverText: 'hover:text-green-700',
          buttonBg: 'bg-green-600',
          buttonHover: 'hover:bg-green-700',
          userBg: 'bg-green-50',
          userIcon: 'bg-green-600',
          footerHoverBg: 'hover:bg-green-100',
          footerHoverText: 'hover:text-green-800',
        };
      case 'Clerk':
        return {
          primary: 'purple',
          headerBg: 'bg-purple-50',
          titleColor: 'text-purple-700',
          iconColor: 'text-purple-500',
          activeBg: 'bg-purple-50',
          activeText: 'text-purple-700',
          hoverBg: 'hover:bg-purple-50',
          hoverText: 'hover:text-purple-700',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700',
          userBg: 'bg-purple-50',
          userIcon: 'bg-purple-600',
          footerHoverBg: 'hover:bg-purple-100',
          footerHoverText: 'hover:text-purple-800',
        };
      default:
        return {
          primary: 'gray',
          headerBg: 'bg-gray-50',
          titleColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          activeBg: 'bg-gray-50',
          activeText: 'text-gray-700',
          hoverBg: 'hover:bg-gray-50',
          hoverText: 'hover:text-gray-700',
          buttonBg: 'bg-gray-600',
          buttonHover: 'hover:bg-gray-700',
          userBg: 'bg-gray-50',
          userIcon: 'bg-gray-600',
          footerHoverBg: 'hover:bg-gray-100',
          footerHoverText: 'hover:text-gray-800',
        };
    }
  };
  const menuItems = getMenuItems();
  const footerItems = getFooterItems();
  const panelTitle = getPanelTitle();
  const theme = getThemeColors();

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}, Current path: ${location.pathname}`);
    navigate(path);
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-22 left-0 h-[calc(100vh-4rem)] ${isPinned ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 shadow-lg z-30 transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col h-full">
        {/* Header - always visible */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${theme.headerBg} h-16`}>
          {isPinned ? (
            <>
              <h2 className={`text-xl font-semibold ${theme.titleColor}`}>{panelTitle}</h2>
              <button
                onClick={togglePinned}
                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <FiChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={togglePinned}
                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <FiChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center ${isPinned ? 'space-x-3' : 'justify-center'} p-3 rounded-lg transition-colors text-sm font-medium ${location.pathname === item.path
                    ? `${theme.activeBg} ${theme.activeText}`
                    : `text-gray-600 ${theme.hoverBg} ${theme.hoverText}`
                    }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                  title={!isPinned ? item.title : undefined}
                >
                  <item.icon className={`w-5 h-5 ${theme.iconColor}`} />
                  {isPinned && <span>{item.title}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-gray-200 ${theme.headerBg}`}>
          <ul className="space-y-1 mb-4">
            {footerItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center ${isPinned ? 'space-x-3' : 'justify-center'} p-3 rounded-lg transition-colors text-sm font-medium ${location.pathname === item.path
                    ? `${theme.activeBg} ${theme.activeText}`
                    : `text-gray-600 ${theme.footerHoverBg} ${theme.footerHoverText}`
                    }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                  title={!isPinned ? item.title : undefined}
                >
                  <item.icon className={`w-5 h-5 ${theme.iconColor}`} />
                  {isPinned && <span>{item.title}</span>}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center ${isPinned ? 'space-x-3' : 'justify-center'} p-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors`}
                title={!isPinned ? 'Sign Out' : undefined}
              >
                <FiLogOut className="w-5 h-5 text-red-500" />
                {isPinned && <span>Sign Out</span>}
              </button>
            </li>
          </ul>

          {/* User section with dropdown */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserDropdown((prev) => !prev)}
              className={`flex items-center ${isPinned ? 'space-x-3' : 'justify-center'} p-3 w-full ${theme.userBg} rounded-lg hover:bg-gray-100 transition-colors`}
              title={!isPinned ? `${userName} (${userRole})` : undefined}
            >
              <div className={`w-10 h-10 ${theme.userIcon} rounded-full flex items-center justify-center text-white font-semibold`}>
                {userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              {isPinned && (
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{userName || 'User'}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              )}
            </button>

            {showUserDropdown && isPinned && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-full mb-2 left-0 w-56 bg-white rounded-md shadow-lg border border-gray-200 p-4"
              >
                <p className="text-gray-800 font-semibold">{userName}</p>
                <p className="text-gray-500 text-xs">{userRole}</p>
                <p className="text-gray-500 text-sm">{userEmail}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
};

export default Sidebar;