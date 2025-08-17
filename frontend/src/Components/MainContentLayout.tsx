import React from 'react';

interface MainContentLayoutProps {
  isPinned: boolean;
  children: React.ReactNode;
  className?: string;
}

const MainContentLayout: React.FC<MainContentLayoutProps> = ({ isPinned, children, className = '' }) => {
  return (
    <div className={`flex-1 p-4 relative z-10 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-12'} ${className}`}>
      {children}
    </div>
  );
};

export default MainContentLayout;