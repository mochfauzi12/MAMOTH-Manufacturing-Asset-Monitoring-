import React, { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600/90 text-white text-center py-2 px-4 text-xs font-semibold tracking-wide backdrop-blur shadow-md flex items-center justify-center gap-2 z-50">
      <span>⚠️</span>
      <span><strong>Mode Offline:</strong> Koneksi internet putus. Data akan disimpan lokal di device.</span>
    </div>
  );
}
