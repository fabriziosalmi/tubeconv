const CACHE_NAME = 'tubeconv-v1.0.0';
const urlsToCache = [
  '/',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🚀 Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: App shell cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests - they need to be online
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache successful responses
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Background sync for failed conversions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-convert') {
    event.waitUntil(
      // Handle background conversion retry
      handleBackgroundConversion()
    );
  }
});

// Push notification support for conversion completion
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Your video conversion is complete!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: [
        {
          action: 'download',
          title: 'Download',
          icon: '/icons/download-32x32.png'
        },
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-32x32.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('TubeConv', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'download') {
    // Handle download action
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'view') {
    // Handle view action
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    // Default action
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function for background conversion retry
async function handleBackgroundConversion() {
  try {
    // Get pending conversions from IndexedDB
    const pendingConversions = await getPendingConversions();
    
    for (const conversion of pendingConversions) {
      try {
        await retryConversion(conversion);
        await removePendingConversion(conversion.id);
      } catch (error) {
        console.error('Background conversion failed:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingConversions() {
  // Implementation would use IndexedDB
  return [];
}

async function retryConversion(conversion) {
  // Implementation would retry the conversion
  return fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conversion.data)
  });
}

async function removePendingConversion(id) {
  // Implementation would remove from IndexedDB
  console.log('Removing pending conversion:', id);
}
