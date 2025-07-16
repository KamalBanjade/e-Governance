// contexts/DialogContext.tsx
import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { FiX, FiAlertTriangle, FiTrash2, FiInfo, FiCheckCircle } from 'react-icons/fi';

interface DialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  showCancel?: boolean;
}

interface DialogContextType {
  showDialog: (config: Omit<DialogConfig, 'isOpen'>) => void;
  closeDialog: () => void;
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: 'warning' | 'danger' | 'info' | 'success';
      confirmText?: string;
      cancelText?: string;
      showCancel?: boolean;
    }
  ) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

interface DialogProviderProps {
  children: ReactNode;
}

const CustomDialog: React.FC<DialogConfig> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  showCancel = true
}) => {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <FiTrash2 className="h-6 w-6 text-white" />,
          confirmBg: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25',
          accentColor: 'text-red-500',
          iconBg: 'bg-red-500',
          headerBg: 'bg-gradient-to-r from-red-50 to-red-100'
        };
      case 'info':
        return {
          icon: <FiInfo className="h-6 w-6 text-white" />,
          confirmBg: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25',
          accentColor: 'text-blue-500',
          iconBg: 'bg-blue-500',
          headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100'
        };
      case 'success':
        return {
          icon: <FiCheckCircle className="h-6 w-6 text-white" />,
          confirmBg: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25',
          accentColor: 'text-green-500',
          iconBg: 'bg-green-500',
          headerBg: 'bg-gradient-to-r from-green-50 to-green-100'
        };
      default:
        return {
          icon: <FiAlertTriangle className="h-6 w-6 text-white" />,
          confirmBg: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25',
          accentColor: 'text-amber-500',
          iconBg: 'bg-amber-500',
          headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100'
        };
    }
  };

  const { icon, confirmBg, iconBg, headerBg } = getIconAndColors();

  return (
    <>
      {/* Backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md transform transition-all duration-300 scale-100 opacity-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            
            {/* Header with gradient */}
            <div className={`${headerBg} px-6 py-5 border-b border-gray-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Icon with background */}
                  <div className={`${iconBg} p-3 rounded-xl shadow-lg`}>
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {title}
                    </h3>
                    <div className="h-0.5 w-8 bg-gray-400 mt-1 rounded-full" />
                  </div>
                </div>
                
                {showCancel && (
                  <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200 hover:scale-110"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 bg-white">
              <p className="text-gray-700 leading-relaxed text-base">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                {showCancel && (
                  <button
                    onClick={onCancel}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 hover:border-gray-400 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={onConfirm}
                  className={`px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105 ${confirmBg}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    showCancel: true
  });

  const showDialog = (config: Omit<DialogConfig, 'isOpen'>) => {
    setDialogConfig({
      ...config,
      isOpen: true,
      onCancel: config.onCancel || closeDialog,
      showCancel: config.showCancel !== false
    });
  };

  const closeDialog = () => {
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
  };

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: 'warning' | 'danger' | 'info' | 'success';
      confirmText?: string;
      cancelText?: string;
      showCancel?: boolean;
    }
  ) => {
    showDialog({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      },
      type: options?.type || 'warning',
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      showCancel: options?.showCancel !== false
    });
  };

  const contextValue: DialogContextType = {
    showDialog,
    closeDialog,
    confirm
  };

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <CustomDialog {...dialogConfig} />
    </DialogContext.Provider>
  );
};