'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[DOIT] Service worker registered:', reg.scope);
          setInterval(() => { reg.update(); }, 60 * 60 * 1000);
        })
        .catch((err) => console.log('[DOIT] SW registration failed:', err));
    }
  }, []);
  return null;
}
