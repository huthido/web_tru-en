/* eslint-disable no-restricted-globals */
// Code thêm vào service worker do next-pwa sinh ra (next-pwa tự gộp thư mục
// `worker/` vào sw.js lúc build). Nhận Web Push từ backend
// (WebPushService) và mở đúng trang khi người dùng bấm thông báo.

// Bản deploy mới (service worker mới) → xoá cache trang chương đã lưu: HTML
// cũ trỏ tới file CSS/JS đã bị xoá nên mở offline sẽ mất giao diện.
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.delete('chapter-pages').catch(function () {}));
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'YÊU', body: event.data ? event.data.text() : '' };
  }
  var title = data.title || 'YÊU';
  var options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/thong-bao' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var path = (event.notification.data && event.notification.data.url) || '/thong-bao';
  // Chỉ mở đường dẫn cùng site.
  var target = new URL(path, self.location.origin);
  if (target.origin !== self.location.origin) target = new URL('/thong-bao', self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          return client
            .focus()
            .then(function (c) {
              return c && 'navigate' in c ? c.navigate(target.href) : self.clients.openWindow(target.href);
            })
            // navigate() lỗi với tab SW chưa kiểm soát → mở tab mới thay vì im lặng.
            .catch(function () {
              return self.clients.openWindow(target.href);
            });
        }
      }
      return self.clients.openWindow(target.href);
    })
  );
});
