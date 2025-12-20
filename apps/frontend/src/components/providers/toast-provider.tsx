'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ToastContainer, Toast, ToastType, setGlobalToastHandler } from '@/components/ui/toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Set global toast handler so components can use it
  useEffect(() => {
    setGlobalToastHandler(showToast);

    // Listen for custom events
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.message) {
        showToast(customEvent.detail.message, customEvent.detail.type || 'info');
      }
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => {
      window.removeEventListener('show-toast', handleToastEvent);
      setGlobalToastHandler(() => {}); // Set to no-op function instead of null
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback: return a no-op function if ToastProvider is not available
    // This allows components to work even if ToastProvider is missing
    console.warn('useToastContext called outside ToastProvider, toasts will not be shown');
    return {
      showToast: (message: string, type?: ToastType) => {
        console.log(`[Toast] ${type || 'info'}: ${message}`);
      },
    };
  }
  return context;
}

