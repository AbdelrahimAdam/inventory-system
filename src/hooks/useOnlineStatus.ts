import { useEffect, useState } from 'react';
import { syncPendingOperations } from '../lib/sync';

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) syncPendingOperations();
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
