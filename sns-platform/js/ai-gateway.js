/**
 * DIVOOST SNS Platform - AI Gateway (Backend Proxy 모드)
 *
 * 모든 AI 호출은 회사 백엔드(Supabase Edge Functions)를 거쳐:
 *  - 회사 마스터 API 키로 프로바이더 호출
 *  - 크레딧 자동 차감
 *  - 사용 이력 기록
 *  - 생성물 Storage 영구 저장
 *
 * 고객은 본인 API 키 입력 불필요.
 */
(function(){
    'use strict';

    var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

    // ─── 모델 카탈로그 (백엔드와 동기화) ───
    // 가격은 cent 단위 (1센트 = 0.01 USD)
    var IMAGE_MODELS = {
        'flux-schnell':    {label: 'Flux Schnell (빠름)',           chargedCents: 2,  premium: false},
        'flux-1.1-pro':    {label: 'Flux 1.1 Pro (고품질)',          chargedCents: 7,  premium: false},
        'ideogram-v2':     {label: 'Ideogram v2 (텍스트 정확)',      chargedCents: 14, premium: true},
        'sdxl':            {label: 'SDXL (저렴)',                   chargedCents: 2,  premium: false},
        'dall-e-3':        {label: 'DALL-E 3 (OpenAI)',             chargedCents: 7,  premium: true}
    };

    var VIDEO_MODELS = {
        'pika-2.0':        {label: 'Pika 2.0',                    chargedPerSecCents: 11, defaultDuration: 5, premium: false},
        'luma-dream':      {label: 'Luma Dream Machine',          chargedPerSecCents: 12, defaultDuration: 5, premium: false},
        'kling-2':         {label: 'Kling 2.0 (가성비)',           chargedPerSecCents: 7,  defaultDuration: 5, premium: false},
        'hailuo':          {label: 'Hailuo (Minimax)',            chargedPerSecCents: 9,  defaultDuration: 6, premium: false},
        'runway-gen3':     {label: 'Runway Gen-3 (최고품질)',      chargedPerSecCents: 17, defaultDuration: 5, premium: true}
    };

    // ─── 인증 토큰 ───
    function getAuthToken(){
        try {
            var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null');
            return s ? s.access_token : null;
        } catch(e){ return null; }
    }

    // ─── Edge Function 호출 ───
    async function invokeFunction(name, body){
        var token = getAuthToken();
        if(!token) throw new Error('로그인이 필요합니다');
        var url = SUPABASE_URL + '/functions/v1/' + name;
        var r = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body || {})
        });
        var d;
        try { d = await r.json(); } catch(e){ throw new Error('백엔드 응답 파싱 실패 (HTTP ' + r.status + ')'); }
        if(!d.success){
            var err = new Error(d.error || 'unknown error');
            err.code = r.status;
            err.detail = d;
            throw err;
        }
        return d;
    }

    // ─── 잔액 조회 ───
    async function getBalance(){
        var token = getAuthToken();
        if(!token) return null;
        var url = SUPABASE_URL + '/rest/v1/credit_balances?select=subscription_credits_cents,paid_credits_cents,total_used_cents';
        var r = await fetch(url, {
            headers: {'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_KEY}
        });
        var d = await r.json();
        if(Array.isArray(d) && d.length > 0){
            var row = d[0];
            return {
                totalCents: (row.subscription_credits_cents||0) + (row.paid_credits_cents||0),
                subscriptionCents: row.subscription_credits_cents || 0,
                paidCents: row.paid_credits_cents || 0,
                totalUsedCents: row.total_used_cents || 0
            };
        }
        return {totalCents: 0, subscriptionCents: 0, paidCents: 0, totalUsedCents: 0};
    }

    // ─── 이미지 생성 ───
    async function generateImage(opts){
        opts = opts || {};
        if(!opts.prompt) throw new Error('prompt 필수');
        var modelKey = opts.model || 'flux-schnell';
        if(!IMAGE_MODELS[modelKey]) throw new Error('지원하지 않는 모델: ' + modelKey);

        var result = await invokeFunction('ai-generate-image', {
            prompt: opts.prompt,
            model: modelKey,
            aspect: opts.aspect || '1:1'
        });
        return {
            url: result.url,
            model: result.model,
            provider: result.provider,
            chargedCents: result.charged_cents,
            balanceCents: result.balance_cents
        };
    }

    // ─── 영상 생성 ───
    async function generateVideo(opts){
        opts = opts || {};
        if(!opts.prompt) throw new Error('prompt 필수');
        var modelKey = opts.model || 'pika-2.0';
        if(!VIDEO_MODELS[modelKey]) throw new Error('지원하지 않는 영상 모델: ' + modelKey);

        var result = await invokeFunction('ai-generate-video', {
            prompt: opts.prompt,
            model: modelKey,
            aspect: opts.aspect || '9:16',
            duration: opts.duration || VIDEO_MODELS[modelKey].defaultDuration
        });
        return {
            url: result.url,
            model: result.model,
            provider: result.provider,
            chargedCents: result.charged_cents,
            balanceCents: result.balance_cents
        };
    }

    function listImageModels(){
        return Object.keys(IMAGE_MODELS).map(function(k){
            return Object.assign({id: k}, IMAGE_MODELS[k]);
        });
    }
    function listVideoModels(){
        return Object.keys(VIDEO_MODELS).map(function(k){
            return Object.assign({id: k}, VIDEO_MODELS[k]);
        });
    }

    function estimateCost(type, modelKey, opts){
        opts = opts || {};
        if(type === 'image'){
            var m = IMAGE_MODELS[modelKey];
            return m ? m.chargedCents / 100 : 0; // USD
        } else {
            var m = VIDEO_MODELS[modelKey];
            if(!m) return 0;
            var dur = opts.duration || m.defaultDuration;
            return (m.chargedPerSecCents * dur) / 100;
        }
    }

    function centsToKrw(cents, exchangeRate){
        // 기본 환율 1USD = 1400원
        var rate = exchangeRate || 1400;
        return Math.round((cents / 100) * rate);
    }

    function buildSnsPrompt(text, opts){
        opts = opts || {};
        var hint = '';
        if(opts.platform === 'instagram') hint = ', Instagram-friendly composition, vibrant colors';
        else if(opts.platform === 'tiktok') hint = ', dynamic energy, viral aesthetic';
        else if(opts.platform === 'xiaohongshu') hint = ', soft pastel tones, lifestyle aesthetic';
        return text + hint + ', high quality, professional photography';
    }

    window.SNSAI = {
        generateImage: generateImage,
        generateVideo: generateVideo,
        listImageModels: listImageModels,
        listVideoModels: listVideoModels,
        estimateCost: estimateCost,
        centsToKrw: centsToKrw,
        buildSnsPrompt: buildSnsPrompt,
        getBalance: getBalance,
        IMAGE_MODELS: IMAGE_MODELS,
        VIDEO_MODELS: VIDEO_MODELS
    };
})();
