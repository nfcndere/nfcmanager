'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;
    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registrationRef = registration;
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch(() => {
        // Service worker indisponible (mode privé ou dev).
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      void registrationRef;
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-14 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 border-l-4 border-[#8cea5a] bg-[#0c130e] px-4 py-3 text-xs font-medium text-white shadow-xl"
    >
      <span>Nouvelle version de l’application disponible.</span>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage({ type: 'SKIP_WAITING' })}
        className="inline-flex min-h-10 items-center gap-1.5 bg-[#8cea5a] px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#0c130e]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Actualiser
      </button>
    </div>
  );
}
