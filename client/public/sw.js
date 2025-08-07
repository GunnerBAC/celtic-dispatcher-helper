// Service Worker for Enhanced Background Notifications
// Service workers can show notifications even when tabs are in background

const CACHE_NAME = 'dispatcher-helper-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Enhanced notification handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    console.log('🔔 SERVICE WORKER: Showing notification', title);
    
    // Service worker notifications bypass many browser restrictions
    self.registration.showNotification(title, {
      ...options,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false, // Allow auto-dismiss
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        {
          action: 'view',
          title: 'View Alert',
          icon: '/favicon.ico'
        },
        {
          action: 'dismiss', 
          title: 'Dismiss',
          icon: '/favicon.ico'
        }
      ],
      data: {
        timestamp: Date.now(),
        url: self.location.origin,
        ...options.data
      }
    });
    
    // Auto-dismiss service worker notifications after delay
    setTimeout(() => {
      self.registration.getNotifications().then(notifications => {
        notifications.forEach(notification => {
          if (notification.title === title) {
            notification.close();
          }
        });
      });
    }, options.tag && options.tag.includes('critical') ? 10000 : 5000);
  }
  
  if (event.data && event.data.type === 'FORCE_CLOSE_NOTIFICATION') {
    const { tag } = event.data;
    console.log('🔔 SERVICE WORKER: Force closing notification with tag:', tag);
    
    // Get all notifications and close matching ones
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => {
        if (notification.tag === tag) {
          notification.close();
          console.log('🔄 SERVICE WORKER: Closed notification with tag:', tag);
        }
      });
    }).catch((error) => {
      console.error('❌ SERVICE WORKER: Failed to close notifications:', error);
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 SERVICE WORKER: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open/focus the app window
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // Focus existing window if available
          for (const client of clients) {
            if (client.url.includes(self.location.origin)) {
              return client.focus();
            }
          }
          // Open new window if no existing window
          return self.clients.openWindow('/');
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 SERVICE WORKER: Notification closed');
});