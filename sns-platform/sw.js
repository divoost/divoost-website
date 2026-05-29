/**
 * DIVOOST SNS Platform - Service Worker
 * 오프라인 지원 + 캐싱 + 푸시 알림
 */
var CACHE_NAME = 'divoost-sns-v1';
var ASSETS_TO_CACHE = [
    '/divoost-website/sns-platform/',
    '/divoost-website/sns-platform/index.html',
    '/divoost-website/sns-platform/auth.html',
    '/divoost-website/sns-platform/css/sns.css',
    '/divoost-website/sns-platform/js/auth-guard.js',
    '/divoost-website/sns-platform/js/email-service.js',
    '/divoost-website/sns-platform/manifest.json'
];

// 설치 시 정적 자원 캐싱
self.addEventListener('install', function(event){
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache){
            return cache.addAll(ASSETS_TO_CACHE).catch(function(){
                // 일부 실패해도 진행
            });
        })
    );
    self.skipWaiting();
});

// 활성화 시 옛 캐시 정리
self.addEventListener('activate', function(event){
    event.waitUntil(
        caches.keys().then(function(keys){
            return Promise.all(keys.map(function(key){
                if(key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', function(event){
    if(event.request.method !== 'GET') return;
    // Supabase API 및 외부 API는 캐싱 안 함
    var url = event.request.url;
    if(url.indexOf('supabase.co') > -1 ||
       url.indexOf('graph.facebook.com') > -1 ||
       url.indexOf('graph-video.facebook.com') > -1 ||
       url.indexOf('api.resend.com') > -1){
        return;
    }

    event.respondWith(
        fetch(event.request).then(function(response){
            if(response && response.status === 200 && response.type === 'basic'){
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache){
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(function(){
            return caches.match(event.request);
        })
    );
});

// 푸시 알림 수신 (향후 활용)
self.addEventListener('push', function(event){
    var data = event.data ? event.data.json() : {title: 'DIVOOST SNS', body: '새 알림이 있습니다'};
    event.waitUntil(
        self.registration.showNotification(data.title || 'DIVOOST SNS', {
            body: data.body || '',
            icon: data.icon || '/divoost-website/sns-platform/manifest.json',
            badge: data.badge,
            data: data.data || {},
            actions: data.actions || []
        })
    );
});

// 알림 클릭
self.addEventListener('notificationclick', function(event){
    event.notification.close();
    var url = event.notification.data.url || '/divoost-website/sns-platform/';
    event.waitUntil(
        self.clients.matchAll({type: 'window'}).then(function(clients){
            for(var i = 0; i < clients.length; i++){
                if(clients[i].url.indexOf(url) > -1) return clients[i].focus();
            }
            return self.clients.openWindow(url);
        })
    );
});
