'use client';

import { useState, useEffect } from 'react';
import { Download, Sparkles, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallModal() {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Détection PWA déjà installée / mode standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error navigator.standalone exists on iOS Safari
      window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    // Détection mobile (tactile ou écran smartphone)
    const isMobileDevice =
      /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent.toLowerCase()) ||
      (window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window);

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
    setIsIos(isIosDevice);

    // Écoute de l'événement natif d'installation Chromium (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (isMobileDevice) {
        setShowModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS Safari : afficher la modale guidée
    if (isMobileDevice && isIosDevice) {
      const iosSeen = localStorage.getItem('nfc_pwa_ios_seen');
      if (!iosSeen) {
        const timer = setTimeout(() => setShowModal(true), 600);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowModal(false);
        }
      } catch (err) {
        console.error('Erreur lors de l’installation PWA:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      localStorage.setItem('nfc_pwa_ios_seen', 'true');
    }
  };

  if (!showModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-2xl animate-slide-up">
        {/* En-tête sobre avec blason */}
        <div className="p-5 pb-3 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--nfc-surface-subtle)] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo Ngaoundéré FC"
              className="h-full w-full object-contain"
            />
          </div>
          <h2
            id="pwa-install-title"
            className="text-base font-semibold text-[var(--nfc-text)]"
          >
            Installer NFC Manager
          </h2>
          <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">
            Administration mobile rapide et hors-ligne
          </p>
        </div>

        {/* Corps */}
        <div className="px-5 pb-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--nfc-muted)] bg-[var(--nfc-surface-subtle)] p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--nfc-green)] shrink-0" />
              <span>1-clic direct</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[var(--nfc-green)] shrink-0" />
              <span>Hors-ligne</span>
            </div>
          </div>

          {isIos && !deferredPrompt ? (
            <div className="bg-[var(--nfc-surface-subtle)] p-3 rounded-lg text-xs space-y-1.5">
              <p className="font-medium text-[var(--nfc-text)] flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-[var(--nfc-green)]" />
                Installation sur iOS Safari :
              </p>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-[var(--nfc-muted)]">
                <li>Appuyez sur <strong>Partager</strong> <span className="font-mono">⎋</span>.</li>
                <li>Sélectionnez <strong>Sur l'écran d'accueil</strong>.</li>
                <li>Appuyez sur <strong>Ajouter</strong>.</li>
              </ol>
              <Button
                variant="primary"
                className="w-full mt-2"
                size="sm"
                onClick={() => {
                  localStorage.setItem('nfc_pwa_ios_seen', 'true');
                  setShowModal(false);
                }}
              >
                Compris
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              loading={isInstalling}
              className="w-full text-xs"
              onClick={handleInstallClick}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Installer sur l'écran d'accueil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
