/**
 * DIVOOST SNS Platform - Supabase Admin Client
 * 관리자 페이지에서 실제 Supabase 데이터를 조회/조작하는 클라이언트
 *
 * 사용:
 *   <script src="../js/auth-guard.js"></script>
 *   <script src="../js/supabase-admin.js"></script>
 *   await SNSAdmin.requireAdmin();  // 페이지 진입 시 호출
 *   var users = await SNSAdmin.listUsers();
 */
(function(){
    'use strict';

    var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

    // ─── 세션/토큰 가져오기 ───
    function getToken(){
        try {
            var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null');
            return s ? s.access_token : null;
        } catch(e){ return null; }
    }

    function getUserId(){
        try {
            var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null');
            return s && s.user ? s.user.id : null;
        } catch(e){ return null; }
    }

    function getUserEmail(){
        try {
            var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null');
            return s && s.user ? s.user.email : null;
        } catch(e){ return null; }
    }

    // ─── Supabase REST API 호출 (PostgREST) ───
    async function rest(table, options){
        options = options || {};
        var url = SUPABASE_URL + '/rest/v1/' + table;
        if(options.query) url += '?' + options.query;

        var token = getToken();
        var headers = {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        if(token) headers['Authorization'] = 'Bearer ' + token;
        if(options.range) headers['Range'] = options.range;

        var fetchOpts = {
            method: options.method || 'GET',
            headers: headers
        };
        if(options.body) fetchOpts.body = JSON.stringify(options.body);

        try {
            var r = await fetch(url, fetchOpts);
            var data = null;
            try { data = await r.json(); } catch(e){}
            return {ok: r.ok, status: r.status, data: data};
        } catch(err){
            return {ok: false, status: 0, data: {message: err.message}};
        }
    }

    // ─── 현재 사용자가 관리자인지 확인 ───
    async function isCurrentUserAdmin(){
        var userId = getUserId();
        if(!userId) return false;

        var result = await rest('profiles', {
            query: 'id=eq.' + userId + '&select=role'
        });
        if(!result.ok || !result.data || result.data.length === 0) return false;
        var role = result.data[0].role;
        return role === 'admin' || role === 'super_admin';
    }

    // ─── 관리자 권한 강제 (페이지 진입 시) ───
    async function requireAdmin(){
        // 1. 로그인 확인
        if(!getToken()){
            alert('⚠️ 로그인이 필요합니다');
            window.location.href = '../auth.html';
            return false;
        }

        // 2. 관리자 권한 확인
        var isAdmin = await isCurrentUserAdmin();
        if(!isAdmin){
            alert('🚫 관리자 권한이 없습니다.\n\n관리자 권한을 받으려면 Supabase Dashboard에서:\nUPDATE profiles SET role = \'super_admin\' WHERE email = \'본인이메일\';');
            window.location.href = '../index.html';
            return false;
        }

        // 3. 본인 정보 표시 (페이지에 #adminName 있을 경우)
        var nameEl = document.getElementById('adminName');
        if(nameEl) nameEl.textContent = getUserEmail();

        return true;
    }

    // ─── 회원 목록 ───
    async function listUsers(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc';

        if(filters.search){
            query += '&or=(email.ilike.%' + encodeURIComponent(filters.search) + '%,full_name.ilike.%' + encodeURIComponent(filters.search) + '%)';
        }
        if(filters.status) query += '&status=eq.' + filters.status;
        if(filters.plan) query += '&plan=eq.' + filters.plan;
        if(filters.limit) query += '&limit=' + filters.limit;

        var result = await rest('profiles', {query: query});
        return result.ok ? result.data : [];
    }

    // ─── 회원 통계 ───
    async function getUserStats(){
        var users = await listUsers();
        var now = Date.now();
        var thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        var thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0,0,0,0);

        return {
            total: users.length,
            active: users.filter(function(u){
                return u.status === 'active' && u.last_active_at &&
                    new Date(u.last_active_at).getTime() > thirtyDaysAgo;
            }).length,
            paid: users.filter(function(u){ return u.plan && u.plan !== 'trial'; }).length,
            newThisMonth: users.filter(function(u){
                return u.created_at && new Date(u.created_at).getTime() > thisMonthStart.getTime();
            }).length,
            suspended: users.filter(function(u){ return u.status === 'suspended'; }).length
        };
    }

    // ─── 사용자 상태/플랜 변경 ───
    async function updateUser(userId, updates){
        var result = await rest('profiles', {
            method: 'PATCH',
            query: 'id=eq.' + userId,
            body: updates
        });
        if(result.ok){
            await logAdminAction({
                action: 'USER_UPDATE',
                severity: 'warn',
                target: userId,
                metadata: updates
            });
        }
        return result;
    }

    async function suspendUser(userId, reason){
        var result = await updateUser(userId, {status: 'suspended'});
        if(result.ok){
            await logAdminAction({
                action: 'USER_SUSPEND',
                severity: 'critical',
                target: userId,
                metadata: {reason: reason || ''}
            });
        }
        return result;
    }

    async function activateUser(userId){
        var result = await updateUser(userId, {status: 'active'});
        if(result.ok){
            await logAdminAction({
                action: 'USER_ACTIVATE',
                severity: 'warn',
                target: userId
            });
        }
        return result;
    }

    // ─── 활동 로그 기록 ───
    async function logActivity(action){
        var userId = getUserId();
        if(!userId) return;

        await rest('activity_logs', {
            method: 'POST',
            body: {
                user_id: userId,
                user_email: getUserEmail(),
                action_type: action.type,
                action_detail: action.detail,
                target: action.target,
                user_agent: navigator.userAgent,
                metadata: action.metadata || null
            }
        });
    }

    async function listActivities(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc&limit=' + (filters.limit || 100);

        if(filters.userId) query += '&user_id=eq.' + filters.userId;
        if(filters.actionType) query += '&action_type=eq.' + filters.actionType;
        if(filters.since){
            query += '&created_at=gte.' + encodeURIComponent(new Date(filters.since).toISOString());
        }

        var result = await rest('activity_logs', {query: query});
        return result.ok ? result.data : [];
    }

    // ─── 관리자 감사 로그 ───
    async function logAdminAction(action){
        var userId = getUserId();
        var email = getUserEmail();
        if(!userId || !email) return;

        await rest('audit_logs', {
            method: 'POST',
            body: {
                admin_id: userId,
                admin_email: email,
                action: action.action,
                severity: action.severity || 'info',
                target: action.target || '',
                success: action.success !== false,
                metadata: action.metadata || null
            }
        });
    }

    async function listAuditLogs(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc&limit=' + (filters.limit || 100);
        if(filters.severity) query += '&severity=eq.' + filters.severity;
        if(filters.adminId) query += '&admin_id=eq.' + filters.adminId;

        var result = await rest('audit_logs', {query: query});
        return result.ok ? result.data : [];
    }

    // ─── 게시물(Posts) ───
    async function listPosts(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc&limit=' + (filters.limit || 50);
        if(filters.userId) query += '&user_id=eq.' + filters.userId;
        if(filters.status) query += '&status=eq.' + filters.status;

        var result = await rest('sns_posts', {query: query});
        return result.ok ? result.data : [];
    }

    async function getPostStats(){
        var today = new Date();
        today.setHours(0,0,0,0);
        var result = await rest('sns_posts', {
            query: 'select=id,status,created_at&order=created_at.desc&limit=1000'
        });
        if(!result.ok) return {today: 0, total: 0, published: 0, scheduled: 0};

        var posts = result.data;
        return {
            today: posts.filter(function(p){
                return new Date(p.created_at).getTime() >= today.getTime();
            }).length,
            total: posts.length,
            published: posts.filter(function(p){ return p.status === 'published'; }).length,
            scheduled: posts.filter(function(p){ return p.status === 'scheduled'; }).length
        };
    }

    // ─── 신고(Reports) ───
    async function listReports(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc';
        if(filters.status) query += '&status=eq.' + filters.status;
        if(filters.type) query += '&report_type=eq.' + filters.type;
        if(filters.limit) query += '&limit=' + filters.limit;

        var result = await rest('reports', {query: query});
        return result.ok ? result.data : [];
    }

    async function resolveReport(reportId, status){
        var userId = getUserId();
        var result = await rest('reports', {
            method: 'PATCH',
            query: 'id=eq.' + reportId,
            body: {
                status: status,
                resolved_by: userId,
                resolved_at: new Date().toISOString()
            }
        });
        if(result.ok){
            await logAdminAction({
                action: 'REPORT_RESOLVE',
                severity: 'warn',
                target: reportId,
                metadata: {new_status: status}
            });
        }
        return result;
    }

    // ─── 공지(Notices) ───
    async function sendNotice(notice){
        var userId = getUserId();
        var result = await rest('notices', {
            method: 'POST',
            body: {
                type: notice.type || 'general',
                title: notice.title,
                body: notice.body,
                target_plan: notice.targetPlan || 'all',
                created_by: userId
            }
        });
        if(result.ok){
            await logAdminAction({
                action: 'NOTICE_SEND',
                severity: 'info',
                target: notice.title,
                metadata: {target_plan: notice.targetPlan}
            });
        }
        return result;
    }

    async function listNotices(limit){
        var query = 'select=*&order=sent_at.desc&limit=' + (limit || 20);
        var result = await rest('notices', {query: query});
        return result.ok ? result.data : [];
    }

    // ─── API 사용량 통계 ───
    async function getApiUsage(filters){
        filters = filters || {};
        var since = filters.since || new Date(Date.now() - 24*60*60*1000).toISOString();
        var query = 'select=platform,status_code,latency_ms,created_at&created_at=gte.' + encodeURIComponent(since) + '&order=created_at.desc&limit=10000';
        var result = await rest('api_usage', {query: query});
        if(!result.ok) return {};

        var byPlatform = {};
        result.data.forEach(function(row){
            if(!byPlatform[row.platform]){
                byPlatform[row.platform] = {total: 0, success: 0, errors: 0, avgLatency: 0, latencies: []};
            }
            var p = byPlatform[row.platform];
            p.total++;
            if(row.status_code >= 200 && row.status_code < 300) p.success++;
            else p.errors++;
            if(row.latency_ms) p.latencies.push(row.latency_ms);
        });

        Object.keys(byPlatform).forEach(function(k){
            var p = byPlatform[k];
            if(p.latencies.length > 0){
                p.avgLatency = Math.round(p.latencies.reduce(function(a,b){ return a+b; }, 0) / p.latencies.length);
            }
            delete p.latencies;
        });

        return byPlatform;
    }

    async function logApiCall(platform, endpoint, method, statusCode, latencyMs, errorMessage){
        var userId = getUserId();
        if(!userId) return;
        await rest('api_usage', {
            method: 'POST',
            body: {
                user_id: userId,
                platform: platform,
                endpoint: endpoint,
                method: method || 'GET',
                status_code: statusCode,
                latency_ms: latencyMs,
                error_message: errorMessage || null
            }
        });
    }

    // ─── 노출 ───
    window.SNSAdmin = {
        requireAdmin: requireAdmin,
        isCurrentUserAdmin: isCurrentUserAdmin,
        listUsers: listUsers,
        getUserStats: getUserStats,
        updateUser: updateUser,
        suspendUser: suspendUser,
        activateUser: activateUser,
        logActivity: logActivity,
        listActivities: listActivities,
        logAdminAction: logAdminAction,
        listAuditLogs: listAuditLogs,
        listPosts: listPosts,
        getPostStats: getPostStats,
        listReports: listReports,
        resolveReport: resolveReport,
        sendNotice: sendNotice,
        listNotices: listNotices,
        getApiUsage: getApiUsage,
        logApiCall: logApiCall
    };
})();
