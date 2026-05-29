/**
 * SNS Platform Auth Guard
 * 인증 상태 확인 및 비로그인 시 auth.html 로 리다이렉트
 *
 * 사용:
 * <script src="../js/auth-guard.js"></script>
 *
 * 페이지에서:
 * - window.SNSAuth.getUser() : 현재 로그인된 사용자 정보 반환 (없으면 null)
 * - window.SNSAuth.logout() : 로그아웃 + auth.html 로 이동
 * - window.SNSAuth.require() : 로그인 안 되어 있으면 auth.html 로 리다이렉트
 */
(function(){
    'use strict';

    var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

    function getAuthPath(){
        // Determine the relative path to auth.html from current page
        var p = window.location.pathname;
        if(p.indexOf('/sns-platform/pages/') > -1) return '../auth.html';
        if(p.indexOf('/sns-platform/') > -1) return 'auth.html';
        return 'auth.html';
    }

    function getSession(){
        try {
            var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null');
            if(!s || !s.access_token) return null;
            // Check expiry
            if(s.expires_at && s.expires_at * 1000 < Date.now()){
                // Expired - try refresh in background
                refreshSession(s.refresh_token);
                return s; // still return so user isn't kicked immediately
            }
            return s;
        } catch(e){ return null; }
    }

    function getUser(){
        var s = getSession();
        return s ? s.user : null;
    }

    function refreshSession(refreshToken){
        if(!refreshToken) return;
        fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            headers: {'apikey': SUPABASE_KEY, 'Content-Type': 'application/json'},
            body: JSON.stringify({refresh_token: refreshToken})
        }).then(function(r){ return r.json(); }).then(function(data){
            if(data.access_token){
                var newSession = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: Math.floor(Date.now()/1000) + (data.expires_in || 3600),
                    user: data.user
                };
                localStorage.setItem('snsAuthSession', JSON.stringify(newSession));
            } else {
                logout();
            }
        }).catch(function(){});
    }

    function logout(){
        var session = getSession();
        if(session && session.access_token){
            // Best-effort server-side logout
            fetch(SUPABASE_URL + '/auth/v1/logout', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + session.access_token
                }
            }).catch(function(){});
        }
        localStorage.removeItem('snsAuthSession');
        localStorage.removeItem('snsAuthEmail');
        localStorage.removeItem('snsAuthName');
        window.location.href = getAuthPath();
    }

    function require(){
        var session = getSession();
        if(!session){
            // Save return URL
            sessionStorage.setItem('snsAuthReturnTo', window.location.href);
            window.location.href = getAuthPath();
            return false;
        }
        return true;
    }

    function updateProfileUI(){
        var user = getUser();
        if(!user) return;
        var name = (user.user_metadata && user.user_metadata.full_name) || localStorage.getItem('snsAuthName') || '';
        var email = user.email || localStorage.getItem('snsAuthEmail') || '';
        var initial = (name || email || 'U').charAt(0).toUpperCase();

        // Update profile in sidebar
        var avatarEl = document.querySelector('.profile-avatar');
        var emailEl = document.querySelector('.profile-email');
        if(avatarEl) avatarEl.textContent = initial;
        if(emailEl) emailEl.textContent = email;
    }

    // ─── 활동 로그 기록 (Supabase) ───
    async function logActivity(actionType, detail, target, metadata){
        var session = getSession();
        if(!session || !session.user) return;
        try {
            await fetch(SUPABASE_URL + '/rest/v1/activity_logs', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + session.access_token,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    user_id: session.user.id,
                    user_email: session.user.email,
                    action_type: actionType,
                    action_detail: detail || '',
                    target: target || '',
                    user_agent: navigator.userAgent,
                    metadata: metadata || null
                })
            });
        } catch(e){}
    }

    // ─── 사용자 활동 시간 갱신 (last_active_at) ───
    async function touchActivity(){
        var session = getSession();
        if(!session || !session.user) return;
        try {
            await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + session.user.id, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + session.access_token,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({last_active_at: new Date().toISOString()})
            });
        } catch(e){}
    }

    // 로그인 시 활동 시간 자동 갱신 (15분마다)
    if(getSession()){
        touchActivity();
        setInterval(touchActivity, 15 * 60 * 1000);
    }

    // ─── 관리자 여부 확인 (Supabase profiles.role 조회) ───
    var _adminCache = null;
    async function isAdmin(){
        if(_adminCache !== null) return _adminCache;
        var session = getSession();
        if(!session || !session.user) return false;
        try {
            var r = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + session.user.id + '&select=role', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + session.access_token
                }
            });
            var d = await r.json();
            if(d && d.length > 0){
                var role = d[0].role;
                _adminCache = (role === 'admin' || role === 'super_admin');
                return _adminCache;
            }
        } catch(e){}
        _adminCache = false;
        return false;
    }

    // ─── 관리자 진입 버튼 자동 주입 ───
    async function injectAdminButton(){
        var admin = await isAdmin();
        if(!admin) return;

        // 이미 추가되어 있으면 skip
        if(document.getElementById('adminSwitchBtn')) return;

        // 사이드바에 관리자 콘솔 메뉴 추가
        var sidebarNav = document.querySelector('.sidebar-nav');
        if(sidebarNav){
            var isOnAdminPage = window.location.pathname.indexOf('/admin/') > -1;
            var adminUrl = isOnAdminPage
                ? (window.location.pathname.indexOf('/admin/') > -1 ? '../index.html' : '/divoost-website/sns-platform/')
                : (window.location.pathname.indexOf('/pages/') > -1 ? '../admin/index.html' : 'admin/index.html');

            var section = document.createElement('div');
            section.className = 'nav-section';
            section.id = 'adminSwitchBtn';
            section.innerHTML = '<div class="nav-title" style="color:#dc2626 !important;font-weight:700">🛡 관리자</div>' +
                '<a href="' + adminUrl + '" class="nav-link" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff !important;font-weight:700;border-radius:8px;box-shadow:0 2px 6px rgba(220,38,38,.25)">' +
                '<span>🛡</span> 관리자 콘솔로 이동' +
                '</a>';
            sidebarNav.appendChild(section);
        }

        // 상단바에도 작은 관리자 배지 추가
        var topBarRight = document.querySelector('.top-bar-right');
        if(topBarRight){
            var isOnAdminPage = window.location.pathname.indexOf('/admin/') > -1;
            if(!isOnAdminPage){
                var adminBtn = document.createElement('a');
                adminBtn.id = 'topBarAdminBtn';
                adminBtn.href = window.location.pathname.indexOf('/pages/') > -1 ? '../admin/index.html' : 'admin/index.html';
                adminBtn.style.cssText = 'padding:7px 14px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:.2s;margin-right:8px';
                adminBtn.innerHTML = '🛡 관리자 콘솔';
                adminBtn.onmouseover = function(){ this.style.transform = 'translateY(-1px)'; this.style.boxShadow = '0 4px 12px rgba(220,38,38,.3)'; };
                adminBtn.onmouseout = function(){ this.style.transform = ''; this.style.boxShadow = ''; };
                topBarRight.insertBefore(adminBtn, topBarRight.firstChild);
            }
        }
    }

    // Expose globally
    window.SNSAuth = {
        getSession: getSession,
        getUser: getUser,
        logout: logout,
        require: require,
        updateProfileUI: updateProfileUI,
        logActivity: logActivity,
        touchActivity: touchActivity,
        isAdmin: isAdmin,
        injectAdminButton: injectAdminButton,
        SUPABASE_URL: SUPABASE_URL,
        SUPABASE_KEY: SUPABASE_KEY
    };

    // 페이지 로드 후 관리자 버튼 자동 주입
    document.addEventListener('DOMContentLoaded', function(){
        if(getSession()){
            setTimeout(injectAdminButton, 100);
        }
    });

    // Auto-require on protected pages (run after DOM loads to ensure no race)
    if(document.body && document.body.hasAttribute('data-require-auth')){
        require();
    } else {
        document.addEventListener('DOMContentLoaded', function(){
            if(document.body.hasAttribute('data-require-auth')){
                if(require()){
                    updateProfileUI();
                }
            } else {
                updateProfileUI();
            }
        });
    }
})();
