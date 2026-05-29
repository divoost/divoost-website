/**
 * DIVOOST SNS Platform - Email Service
 * 이메일 발송 큐 관리 + 템플릿 기반 전송
 *
 * 사용:
 *   await SNSEmail.send({to:'user@example.com', templateKey:'welcome', vars:{name:'홍길동'}})
 *   await SNSEmail.sendBulk(emails, templateKey, vars)
 *   await SNSEmail.getQueue()
 *   await SNSEmail.getTemplates()
 */
(function(){
    'use strict';

    var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

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

        try {
            var r = await fetch(url, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            var data = null;
            try { data = await r.json(); } catch(e){}
            return {ok: r.ok, status: r.status, data: data};
        } catch(err){
            return {ok: false, status: 0, data: {message: err.message}};
        }
    }

    // ─── 템플릿 변수 치환 ───
    function renderTemplate(text, vars){
        if(!text) return '';
        return text.replace(/\{\{(\w+)\}\}/g, function(match, key){
            return vars && vars[key] !== undefined ? vars[key] : match;
        });
    }

    // ─── 템플릿 가져오기 ───
    async function getTemplate(key){
        var r = await rest('email_templates', {
            query: 'key=eq.' + encodeURIComponent(key) + '&is_active=eq.true&select=*'
        });
        if(!r.ok || !r.data || r.data.length === 0) return null;
        return r.data[0];
    }

    async function getTemplates(){
        var r = await rest('email_templates', {query: 'select=*&order=name'});
        return r.ok ? r.data : [];
    }

    async function saveTemplate(template){
        if(template.id){
            return await rest('email_templates', {
                method: 'PATCH',
                query: 'id=eq.' + template.id,
                body: {
                    name: template.name,
                    subject: template.subject,
                    body_html: template.body_html,
                    body_text: template.body_text,
                    variables: template.variables || [],
                    is_active: template.is_active !== false,
                    updated_at: new Date().toISOString()
                }
            });
        } else {
            return await rest('email_templates', {
                method: 'POST',
                body: template
            });
        }
    }

    // ─── 이메일 큐에 추가 ───
    async function queueEmail(options){
        var userId = getUserId();
        var subject, bodyHtml, bodyText;

        if(options.templateKey){
            var template = await getTemplate(options.templateKey);
            if(!template) return {ok: false, message: '템플릿을 찾을 수 없습니다: ' + options.templateKey};
            subject = renderTemplate(template.subject, options.vars);
            bodyHtml = renderTemplate(template.body_html, options.vars);
            bodyText = renderTemplate(template.body_text, options.vars);
        } else {
            subject = options.subject;
            bodyHtml = options.bodyHtml;
            bodyText = options.bodyText;
        }

        if(!options.to || !subject || !bodyHtml){
            return {ok: false, message: 'to, subject, bodyHtml 필수'};
        }

        var r = await rest('email_queue', {
            method: 'POST',
            body: {
                template_key: options.templateKey || null,
                to_email: options.to,
                to_name: options.name || null,
                subject: subject,
                body_html: bodyHtml,
                body_text: bodyText,
                variables: options.vars || {},
                status: 'pending',
                scheduled_at: options.scheduledAt || new Date().toISOString(),
                created_by: userId
            }
        });

        return r;
    }

    // ─── 이메일 발송 (즉시) ───
    async function send(options){
        var r = await queueEmail(options);
        if(!r.ok) return r;

        // 큐에 추가만 함. 실제 발송은 Supabase Edge Function 또는 cron이 처리
        // 또는 사용자가 Resend/SendGrid API 키를 설정했으면 직접 호출
        var resendApiKey = getResendApiKey();
        if(resendApiKey){
            return await sendViaResend(options, resendApiKey, r.data[0].id);
        }

        return {
            ok: true,
            queued: true,
            data: r.data,
            message: '이메일이 큐에 추가되었습니다. (실제 발송은 백엔드 연동 필요)'
        };
    }

    function getResendApiKey(){
        var s = JSON.parse(localStorage.getItem('snsSettings') || '{}');
        return s.email && s.email.resendApiKey ? s.email.resendApiKey : null;
    }

    function getFromEmail(){
        var s = JSON.parse(localStorage.getItem('snsSettings') || '{}');
        return (s.email && s.email.fromEmail) || 'noreply@divoost.com';
    }

    // ─── Resend.com API 직접 호출 (선택) ───
    async function sendViaResend(options, apiKey, queueId){
        var subject, bodyHtml;
        if(options.templateKey){
            var template = await getTemplate(options.templateKey);
            subject = renderTemplate(template.subject, options.vars);
            bodyHtml = renderTemplate(template.body_html, options.vars);
        } else {
            subject = options.subject;
            bodyHtml = options.bodyHtml;
        }

        try {
            var r = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: getFromEmail(),
                    to: [options.to],
                    subject: subject,
                    html: bodyHtml
                })
            });
            var d = await r.json();

            // 큐 상태 업데이트
            if(queueId){
                await rest('email_queue', {
                    method: 'PATCH',
                    query: 'id=eq.' + queueId,
                    body: {
                        status: r.ok ? 'sent' : 'failed',
                        provider: 'resend',
                        provider_message_id: d.id,
                        error_message: r.ok ? null : (d.message || 'Unknown error'),
                        sent_at: r.ok ? new Date().toISOString() : null
                    }
                });
            }

            return {ok: r.ok, message: r.ok ? '발송 완료' : (d.message || '발송 실패'), data: d};
        } catch(err){
            return {ok: false, message: err.message};
        }
    }

    // ─── 대량 발송 ───
    async function sendBulk(emails, templateKey, vars){
        var results = [];
        for(var i = 0; i < emails.length; i++){
            var email = emails[i];
            var perVars = Object.assign({}, vars || {}, email.vars || {});
            var r = await send({
                to: email.to || email,
                name: email.name,
                templateKey: templateKey,
                vars: perVars
            });
            results.push(r);
        }
        return results;
    }

    // ─── 큐 조회 ───
    async function getQueue(filters){
        filters = filters || {};
        var query = 'select=*&order=created_at.desc&limit=' + (filters.limit || 100);
        if(filters.status) query += '&status=eq.' + filters.status;
        if(filters.toEmail) query += '&to_email=eq.' + encodeURIComponent(filters.toEmail);
        var r = await rest('email_queue', {query: query});
        return r.ok ? r.data : [];
    }

    async function getQueueStats(){
        var queue = await getQueue({limit: 1000});
        var stats = {total: queue.length, pending: 0, sent: 0, failed: 0, cancelled: 0};
        queue.forEach(function(e){ stats[e.status] = (stats[e.status] || 0) + 1; });
        return stats;
    }

    // ─── 알림 설정 ───
    async function getNotificationPrefs(){
        var userId = getUserId();
        if(!userId) return null;
        var r = await rest('notification_preferences', {
            query: 'user_id=eq.' + userId + '&select=*'
        });
        return r.ok && r.data.length > 0 ? r.data[0] : null;
    }

    async function updateNotificationPrefs(prefs){
        var userId = getUserId();
        if(!userId) return {ok: false, message: '로그인 필요'};
        return await rest('notification_preferences', {
            method: 'PATCH',
            query: 'user_id=eq.' + userId,
            body: Object.assign({}, prefs, {updated_at: new Date().toISOString()})
        });
    }

    // ─── 공지 자동 발송 (모든 사용자) ───
    async function sendNoticeToAll(notice, targetPlan){
        // 대상 사용자 조회
        var query = 'select=id,email,full_name&status=eq.active';
        if(targetPlan && targetPlan !== 'all') query += '&plan=eq.' + targetPlan;
        var rUsers = await rest('profiles', {query: query});
        if(!rUsers.ok) return {ok: false, message: '사용자 조회 실패'};

        // 알림 설정 확인하여 옵트인한 사용자만
        var rPrefs = await rest('notification_preferences', {
            query: 'email_notice=eq.true&select=user_id'
        });
        var optedInIds = rPrefs.ok ? rPrefs.data.map(function(p){ return p.user_id; }) : [];

        var targets = rUsers.data.filter(function(u){ return optedInIds.indexOf(u.id) > -1; });

        var sentCount = 0;
        for(var i = 0; i < targets.length; i++){
            var user = targets[i];
            await queueEmail({
                to: user.email,
                name: user.full_name,
                templateKey: 'notice',
                vars: {
                    name: user.full_name,
                    title: notice.title,
                    body: notice.body,
                    platform_name: 'DIVOOST SNS'
                }
            });
            sentCount++;
        }

        return {ok: true, sentCount: sentCount, totalUsers: rUsers.data.length};
    }

    window.SNSEmail = {
        getTemplate: getTemplate,
        getTemplates: getTemplates,
        saveTemplate: saveTemplate,
        queueEmail: queueEmail,
        send: send,
        sendBulk: sendBulk,
        getQueue: getQueue,
        getQueueStats: getQueueStats,
        getNotificationPrefs: getNotificationPrefs,
        updateNotificationPrefs: updateNotificationPrefs,
        sendNoticeToAll: sendNoticeToAll,
        renderTemplate: renderTemplate,
        SUPABASE_URL: SUPABASE_URL,
        SUPABASE_KEY: SUPABASE_KEY
    };
})();
