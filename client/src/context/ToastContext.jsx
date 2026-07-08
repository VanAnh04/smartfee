import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastStyles = {
  success: {
    bg: 'bg-success-50',
    border: 'border-success-500',
    icon: CheckCircle,
    iconColor: 'text-success-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-danger-500',
    icon: AlertCircle,
    iconColor: 'text-danger-500',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-500',
    icon: AlertTriangle,
    iconColor: 'text-warning-500',
  },
  info: {
    bg: 'bg-primary-50',
    border: 'border-primary-500',
    icon: Info,
    iconColor: 'text-primary-500',
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    let displayMessage = message;
    if (typeof message === 'object' && message !== null) {
      displayMessage = message.message || message.error || JSON.stringify(message);
    }
    const toast = { id, message: String(displayMessage), type };
    
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => {
          const style = toastStyles[toast.type] || toastStyles.info;
          const Icon = style.icon;
          
          return (
            <div
              key={toast.id}
              className={`${style.bg} ${style.border} border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-fade-in`}
            >
              <Icon className={`${style.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
              <p className="text-gray-800 text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
