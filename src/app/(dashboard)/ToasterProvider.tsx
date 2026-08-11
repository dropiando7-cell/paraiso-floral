'use client';

import { Toaster } from 'react-hot-toast';

export function ToasterProvider() {
  return (
    <div className="print:hidden">
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#1e293b',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
