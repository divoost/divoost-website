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

    // Expose globally
    window.SNSAuth = {
        getSession: getSession,
        getUser: getUser,
        logout: logout,
        require: require,
        updateProfileUI: updateProfileUI,
        logActivity: logActivity,
        touchActivity: touchActivity,
        SUPABASE_URL: SUPABASE_URL,
        SUPABASE_KEY: SUPABASE_KEY
    };

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
