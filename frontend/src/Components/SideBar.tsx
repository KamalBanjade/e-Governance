import { useState, useEffect } from 'react';
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
  FiSettings,
  FiHelpCircle,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
} from 'react-icons/fi';

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
  const { userName, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    onPinChange?.(isPinned);
  }, [isPinned, onPinChange]);

  const togglePinned = () => {
    setIsPinned(!isPinned);
  };

  // Only show sidebar for Admin
  if (userRole !== 'Admin') {
    return null;
  }

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: FiHome, path: '/admin-dashboard' },
    { title: 'Employee', icon: FiUsers, path: '/EmployeeList' },
    { title: 'Customer', icon: FiUsers, path: '/customerList' },
    { title: 'Branches', icon: FiMapPin, path: '/BranchList' },
    { title: 'Bill', icon: FiFileText, path: '/BillList' },
    { title: 'Add Demand', icon: FiBarChart2, path: '/demand-list' },
    { title: 'Payment Method', icon: FiCreditCard, path: '/paymentmethodlist' },
    { title: 'Payments', icon: FiDollarSign, path: '/payment-list' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile toggle button - positioned below navbar */}
      <button
        className="lg:hidden fixed top-16 left-4 z-40 p-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isMobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>
      <div
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] ${isPinned ? 'w-64' : 'w-12'
          } bg-white border-r border-gray-200 shadow-lg z-30 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Collapsed state - just the toggle button */}
          {!isPinned && (
            <div className="flex items-center justify-center p-3 h-16">
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

          {isPinned && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 h-16">
                <h2 className="text-xl font-semibold text-blue-700">Admin Panel</h2>
                <button
                  onClick={togglePinned}
                  className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <FiChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Menu */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => handleNavigation(item.path)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-sm font-medium ${location.pathname === item.path
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        aria-current={location.pathname === item.path ? 'page' : undefined}
                      >
                        <item.icon className="w-5 h-5 text-blue-500" />
                        <span>{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <ul className="space-y-1 mb-4">
                  <li>
                    <button
                      onClick={() => handleNavigation('/settings')}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-sm font-medium ${location.pathname === '/settings'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      aria-current={location.pathname === '/settings' ? 'page' : undefined}
                    >
                      <FiSettings className="w-5 h-5 text-blue-500" />
                      <span>Settings</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigation('/help')}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-sm font-medium ${location.pathname === '/help'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      aria-current={location.pathname === '/help' ? 'page' : undefined}
                    >
                      <FiHelpCircle className="w-5 h-5 text-blue-500" />
                      <span>Get Help</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <FiLogOut className="w-5 h-5 text-red-500" />
                      <span>Logout</span>
                    </button>
                  </li>
                </ul>

                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{userName || 'User'}</p>
                    <p className="text-xs text-gray-500">{userRole}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;