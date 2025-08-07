import { useEffect, useRef, useState } from 'react';

interface NotificationService {
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  updateTabTitle: (alertCount: number) => void;
  resetTabTitle: () => void;
  isSupported: boolean;
}

export function useNotifications(): NotificationService {
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const originalTitle = useRef<string>('');
  const lastInteractionTime = useRef<number>(Date.now());
  const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Store original title
    originalTitle.current = document.title;

    // Check if notifications are supported with additional validation
    const notificationSupported = 'Notification' in window && window.Notification !== null && typeof window.Notification !== 'undefined';

    if (notificationSupported) {
      const permissionGranted = Notification.permission === 'granted';
      setIsSupported(true);
      setHasPermission(permissionGranted);

      // Double-check state update with timeout to catch any race conditions
      setTimeout(() => {
        setIsSupported(true);
        setHasPermission(permissionGranted);
      }, 100);
    } else {
      setIsSupported(false);
      setHasPermission(false);
    }

    // BYPASS STRATEGY 1: Register Service Worker for background notifications
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          serviceWorkerRegistration.current = registration;
        } catch (error) {
          // Service Worker registration failed
        }
      }
    };

    registerServiceWorker();

    // Track tab visibility
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    // Track user interactions to help with notification timing
    const handleUserInteraction = () => {
      lastInteractionTime.current = Date.now();
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for user interactions that can help notifications work
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('focus', handleUserInteraction);

    // Initial visibility state
    setIsTabVisible(!document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('focus', handleUserInteraction);
    };
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    }

    return false;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    const timeSinceInteraction = Date.now() - lastInteractionTime.current;

    // FORCE CORRECT STATE: Browser capabilities override React state
    const actualSupported = 'Notification' in window &&
      window.Notification !== null &&
      typeof window.Notification !== 'undefined';
    const actualPermission = Notification.permission === 'granted';

    if (!actualSupported || !actualPermission) {
      return;
    }

    // BYPASS STRATEGY: Use multiple methods simultaneously for maximum success rate
    const notificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag || `alert-${Date.now()}`,
      requireInteraction: options?.requireInteraction || true,
      silent: false,
      renotify: true,
      vibrate: options?.tag?.includes('critical') ? [200, 100, 200, 100, 200] : [200, 100, 200],
      ...options
    };

    try {
      let notification;

      // Choose ONE strategy to prevent duplicates
      if (serviceWorkerRegistration.current && !isTabVisible) {
        // Service Worker notification for background tabs
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              options: notificationOptions
            });
          }
        });

        // Create dummy notification object for consistency
        notification = {
          close: () => {},
          onclick: null,
          onshow: null,
          onerror: null,
          onclose: null,
          tag: notificationOptions.tag
        };
      } else {
        // Standard notification for foreground tabs
        notification = new Notification(title, {
          ...notificationOptions,
          requireInteraction: false // Allow auto-dismiss
        });
      }

      // This is now handled by the comprehensive auto-close system below
      // Don't add duplicate close timers here

      // Focus stealing for critical alerts (bypasses background tab limits)
      if (options?.tag?.includes('critical') && !isTabVisible) {
        setTimeout(() => {
          try {
            window.focus();
            // Also try to request attention if available
            if ('requestStorageAccess' in document) {
              // Browser attention-grabbing method
              window.dispatchEvent(new Event('focus'));
            }
          } catch (e) {
            // Focus stealing blocked by browser, continuing with other methods
          }
        }, 100);
      }

      // Browser attention handled in AppHeader component

      // Auto-close after specified time (but not for critical alerts)
      const autoCloseTime = options?.requireInteraction ? 0 : 8000; // 8 seconds for non-critical
      if (autoCloseTime > 0) {
        // Store notification reference for reliable closing
        const notificationRef = notification;

        // Strategy 1: Normal close after 8 seconds
        const closeTimeout = setTimeout(() => {
          try {
            if (notificationRef && typeof notificationRef.close === 'function') {
              notificationRef.close();
            }
            console.log('🔄 Notification closed via timeout after', autoCloseTime, 'ms');
          } catch (e) {
            console.log('ℹ️ Normal close failed:', e);
          }
        }, autoCloseTime);

        // Strategy 2: Service Worker force close
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          setTimeout(() => {
            navigator.serviceWorker.controller?.postMessage({
              type: 'FORCE_CLOSE_NOTIFICATION',
              tag: notificationOptions.tag
            });
            console.log('🔄 Service Worker force-close requested');
          }, autoCloseTime + 100); // Slight delay after normal close
        }

        // Strategy 3: DOM manipulation force close
        setTimeout(() => {
          try {
            // Try to close via registration
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                  registration.getNotifications().then(notifications => {
                    notifications.forEach(notif => {
                      if (notif.tag === notificationOptions.tag) {
                        notif.close();
                        console.log('🔄 Registration-based close for tag:', notif.tag);
                      }
                    });
                  });
                }
              });
            }
          } catch (e) {
            console.log('ℹ️ Registration close failed:', e);
          }
        }, autoCloseTime + 200);

        // Store close function for manual cleanup
        (notificationRef as any).forceClose = () => {
          clearTimeout(closeTimeout);
          try {
            notificationRef.close();
          } catch (e) {
            console.log('Manual close failed:', e);
          }
        };
      }

      // Enhanced click handlers
      notification.onclick = (event) => {
        console.log('👆 Notification clicked');
        event.preventDefault();
        window.focus();
        if (window.parent && window.parent !== window) {
          window.parent.focus();
        }
        notification.close();
      };

      notification.onshow = () => {
        console.log('✅ Notification successfully shown');
      };

      notification.onerror = (error) => {
        console.error('❌ Notification error:', error);
      };

      notification.onclose = () => {
        // Don't log generic closes - only our specific timeout closes matter
      };

      console.log('🎯 Notification creation completed successfully');
    } catch (error) {
      console.error('💥 Critical error creating notification:', error);
      if (error instanceof Error) {
        console.error('📋 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  const updateTabTitle = (alertCount: number) => {
    if (alertCount > 0) {
      document.title = `(${alertCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  };

  const resetTabTitle = () => {
    document.title = originalTitle.current;
  };

  return {
    requestPermission,
    showNotification,
    updateTabTitle,
    resetTabTitle,
    isSupported
  };
}