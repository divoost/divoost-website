/**
 * DIVOOST SNS Platform - AI Gateway
 * 멀티 프로바이더 이미지/영상 생성 통합 게이트웨이
 *
 * 지원 프로바이더:
 *  - Replicate (1000+ 모델, 페이 퍼 유즈)
 *  - Fal.ai (빠른 inference, Flux/SDXL/Pika 등)
 *  - OpenAI (DALL-E 3 직접)
 *
 * 사용:
 *   SNSAI.generateImage({prompt:"...", model:"flux-pro", aspect:"9:16"})
 *   SNSAI.generateVideo({prompt:"...", model:"pika-2.0", aspect:"9:16", duration:5})
 */
(function(){
    'use strict';

    var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

    // ─── 지원 모델 카탈로그 ───
    var IMAGE_MODELS = {
        'flux-1.1-pro': {
            provider: 'replicate',
            modelId: 'black-forest-labs/flux-1.1-pro',
            label: 'Flux 1.1 Pro (최고품질)',
            avgTime: 8, costPerImage: 0.04,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect), output_format: 'jpg', safety_tolerance: 2};
            }
        },
        'flux-schnell': {
            provider: 'replicate',
            modelId: 'black-forest-labs/flux-schnell',
            label: 'Flux Schnell (빠름·저렴)',
            avgTime: 2, costPerImage: 0.003,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect), num_outputs: 1, output_format: 'jpg'};
            }
        },
        'ideogram-v2': {
            provider: 'replicate',
            modelId: 'ideogram-ai/ideogram-v2',
            label: 'Ideogram v2 (텍스트 정확)',
            avgTime: 12, costPerImage: 0.08,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToIdeogram(opts.aspect), magic_prompt_option: 'On'};
            }
        },
        'sdxl': {
            provider: 'replicate',
            modelId: 'stability-ai/sdxl',
            label: 'SDXL (저렴)',
            avgTime: 5, costPerImage: 0.003,
            inputBuilder: function(prompt, opts){
                var size = aspectToSDXL(opts.aspect);
                return {prompt: prompt, width: size.w, height: size.h};
            }
        },
        'dall-e-3': {
            provider: 'openai',
            label: 'DALL-E 3 (OpenAI)',
            avgTime: 10, costPerImage: 0.04,
            inputBuilder: function(prompt, opts){
                return {model: 'dall-e-3', prompt: prompt, size: aspectToDallE(opts.aspect), quality: 'standard', n: 1};
            }
        },
        'flux-pro-fal': {
            provider: 'fal',
            modelId: 'fal-ai/flux-pro',
            label: 'Flux Pro (Fal.ai 빠름)',
            avgTime: 5, costPerImage: 0.05,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, image_size: aspectToFal(opts.aspect), num_images: 1};
            }
        }
    };

    var VIDEO_MODELS = {
        'pika-2.0': {
            provider: 'replicate',
            modelId: 'pikalabsai/pika-2.0',
            label: 'Pika 2.0 (5-10초)',
            avgTime: 60, costPerSecond: 0.06,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect), duration: opts.duration || 5};
            }
        },
        'luma-dream': {
            provider: 'replicate',
            modelId: 'luma/dream-machine',
            label: 'Luma Dream Machine (5초)',
            avgTime: 90, costPerSecond: 0.07,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect)};
            }
        },
        'kling-2': {
            provider: 'replicate',
            modelId: 'kwaivgi/kling-v2.0',
            label: 'Kling 2.0 (가성비)',
            avgTime: 120, costPerSecond: 0.04,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect), duration: opts.duration || 5};
            }
        },
        'hailuo': {
            provider: 'replicate',
            modelId: 'minimax/hailuo-02',
            label: 'Hailuo (Minimax) 6초',
            avgTime: 80, costPerSecond: 0.05,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, duration: 6};
            }
        },
        'runway-gen3': {
            provider: 'replicate',
            modelId: 'runwayml/gen-3-alpha',
            label: 'Runway Gen-3 (최고품질)',
            avgTime: 120, costPerSecond: 0.10,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, duration: opts.duration || 5, aspect_ratio: aspectToFlux(opts.aspect)};
            }
        },
        'pika-fal': {
            provider: 'fal',
            modelId: 'fal-ai/pika-v2',
            label: 'Pika v2 (Fal.ai 빠름)',
            avgTime: 45, costPerSecond: 0.06,
            inputBuilder: function(prompt, opts){
                return {prompt: prompt, aspect_ratio: aspectToFlux(opts.aspect), duration: opts.duration || 5};
            }
        }
    };

    // ─── Aspect ratio 변환 헬퍼 ───
    function aspectToFlux(a){ return ({square:'1:1', portrait:'9:16', landscape:'16:9', '4:5':'4:5', '1:1':'1:1', '9:16':'9:16', '16:9':'16:9'})[a||'1:1'] || '1:1'; }
    function aspectToIdeogram(a){ return ({square:'ASPECT_1_1', portrait:'ASPECT_9_16', landscape:'ASPECT_16_9', '1:1':'ASPECT_1_1', '9:16':'ASPECT_9_16', '16:9':'ASPECT_16_9', '4:5':'ASPECT_4_5'})[a||'1:1'] || 'ASPECT_1_1'; }
    function aspectToSDXL(a){
        var map = {'1:1':{w:1024,h:1024}, '9:16':{w:768,h:1344}, '16:9':{w:1344,h:768}, '4:5':{w:896,h:1152}, square:{w:1024,h:1024}, portrait:{w:768,h:1344}, landscape:{w:1344,h:768}};
        return map[a||'1:1'] || {w:1024,h:1024};
    }
    function aspectToDallE(a){ return ({square:'1024x1024', portrait:'1024x1792', landscape:'1792x1024', '1:1':'1024x1024', '9:16':'1024x1792', '16:9':'1792x1024'})[a||'1:1'] || '1024x1024'; }
    function aspectToFal(a){ return ({square:'square_hd', portrait:'portrait_16_9', landscape:'landscape_16_9', '1:1':'square_hd', '9:16':'portrait_16_9', '16:9':'landscape_16_9'})[a||'1:1'] || 'square_hd'; }

    // ─── 설정 읽기 ───
    function getAIConfig(){
        var s = JSON.parse(localStorage.getItem('snsSettings') || '{}');
        return s.ai || {};
    }
    function getProviderKey(provider){
        var ai = getAIConfig();
        var keys = ai.keys || {};
        return keys[provider] || ai.apiKey || '';
    }

    // ─── Supabase 토큰 (Storage 업로드용) ───
    function getSupabaseToken(){
        try { var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null'); return s ? s.access_token : null; } catch(e){ return null; }
    }
    function getSupabaseUserId(){
        try { var s = JSON.parse(localStorage.getItem('snsAuthSession') || 'null'); return s && s.user ? s.user.id : 'anonymous'; } catch(e){ return 'anonymous'; }
    }

    // ─── 결과 URL을 Storage에 영구 저장 ───
    async function persistToStorage(url, type){
        var token = getSupabaseToken();
        if(!token) return url; // 로그인 안되어 있으면 원본 URL 그대로
        try {
            var blobRes = await fetch(url);
            var blob = await blobRes.blob();
            var userId = getSupabaseUserId();
            var ext = type === 'video' ? 'mp4' : 'jpg';
            var fname = userId + '/ai-' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.' + ext;
            var uploadUrl = SUPABASE_URL + '/storage/v1/object/sns-media/' + fname;
            var r = await fetch(uploadUrl, {
                method: 'POST',
                headers: {'Authorization':'Bearer ' + token, 'apikey': SUPABASE_KEY, 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true'},
                body: blob
            });
            if(!r.ok) return url;
            return SUPABASE_URL + '/storage/v1/object/public/sns-media/' + fname;
        } catch(e){ return url; }
    }

    // ─── Replicate API ───
    async function callReplicate(modelId, input, opts){
        var key = getProviderKey('replicate');
        if(!key) throw new Error('Replicate API Key가 설정되지 않았습니다. 설정 → AI 섹션에서 입력하세요.');

        // 1) 예측 생성
        var createUrl = 'https://api.replicate.com/v1/models/' + modelId + '/predictions';
        var createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + key,
                'Content-Type': 'application/json',
                'Prefer': 'wait=60'  // 60초까지 동기 대기 시도
            },
            body: JSON.stringify({input: input})
        });
        var pred = await createRes.json();
        if(pred.error) throw new Error(pred.error);
        if(pred.detail) throw new Error(pred.detail);

        // 2) 동기 대기로 끝났으면 바로 반환
        if(pred.status === 'succeeded' && pred.output){
            return extractOutputUrl(pred.output);
        }
        if(pred.status === 'failed' || pred.status === 'canceled'){
            throw new Error('생성 실패: ' + (pred.error || pred.status));
        }

        // 3) 폴링 (긴 작업)
        var pollUrl = pred.urls && pred.urls.get;
        if(!pollUrl) throw new Error('폴링 URL 없음');
        var maxAttempts = opts && opts.maxAttempts ? opts.maxAttempts : 60; // 최대 5분
        var interval = 5000;
        for(var i = 0; i < maxAttempts; i++){
            await new Promise(function(r){ setTimeout(r, interval); });
            var pr = await fetch(pollUrl, {headers: {'Authorization': 'Token ' + key}});
            var pd = await pr.json();
            if(opts && opts.onProgress) opts.onProgress(pd.status, i);
            if(pd.status === 'succeeded' && pd.output) return extractOutputUrl(pd.output);
            if(pd.status === 'failed' || pd.status === 'canceled') throw new Error('생성 실패: ' + (pd.error || pd.status));
        }
        throw new Error('생성 시간 초과');
    }

    function extractOutputUrl(output){
        if(typeof output === 'string') return output;
        if(Array.isArray(output) && output.length > 0) return output[0];
        if(output && output.url) return output.url;
        throw new Error('예상치 못한 출력 형식: ' + JSON.stringify(output).slice(0,200));
    }

    // ─── Fal.ai API ───
    async function callFal(modelId, input, opts){
        var key = getProviderKey('fal');
        if(!key) throw new Error('Fal.ai API Key가 설정되지 않았습니다.');

        var submitUrl = 'https://queue.fal.run/' + modelId;
        var submitRes = await fetch(submitUrl, {
            method: 'POST',
            headers: {'Authorization': 'Key ' + key, 'Content-Type': 'application/json'},
            body: JSON.stringify(input)
        });
        var submitData = await submitRes.json();
        if(submitData.error || !submitData.request_id) throw new Error(submitData.error || 'Fal.ai 요청 실패');

        var statusUrl = submitData.status_url || ('https://queue.fal.run/' + modelId + '/requests/' + submitData.request_id + '/status');
        var resultUrl = submitData.response_url || ('https://queue.fal.run/' + modelId + '/requests/' + submitData.request_id);

        var maxAttempts = opts && opts.maxAttempts ? opts.maxAttempts : 60;
        for(var i = 0; i < maxAttempts; i++){
            await new Promise(function(r){ setTimeout(r, 3000); });
            var sr = await fetch(statusUrl, {headers: {'Authorization': 'Key ' + key}});
            var sd = await sr.json();
            if(opts && opts.onProgress) opts.onProgress(sd.status, i);
            if(sd.status === 'COMPLETED'){
                var rr = await fetch(resultUrl, {headers: {'Authorization': 'Key ' + key}});
                var rd = await rr.json();
                if(rd.images && rd.images[0]) return rd.images[0].url;
                if(rd.video && rd.video.url) return rd.video.url;
                if(rd.output) return extractOutputUrl(rd.output);
                throw new Error('출력 형식 불명: ' + JSON.stringify(rd).slice(0,200));
            }
            if(sd.status === 'FAILED' || sd.status === 'CANCELLED') throw new Error('Fal.ai 실패: ' + (sd.error || sd.status));
        }
        throw new Error('Fal.ai 시간 초과');
    }

    // ─── OpenAI DALL-E 3 ───
    async function callOpenAI(input){
        var key = getProviderKey('openai');
        if(!key) throw new Error('OpenAI API Key가 설정되지 않았습니다.');
        var r = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
            body: JSON.stringify(input)
        });
        var d = await r.json();
        if(d.error) throw new Error(d.error.message);
        if(!d.data || !d.data[0] || !d.data[0].url) throw new Error('OpenAI 응답 형식 오류');
        return d.data[0].url;
    }

    // ─── 통합 인터페이스 ───
    async function generateImage(opts){
        opts = opts || {};
        if(!opts.prompt) throw new Error('prompt 필수');
        var modelKey = opts.model || getAIConfig().defaultImageModel || 'flux-schnell';
        var model = IMAGE_MODELS[modelKey];
        if(!model) throw new Error('지원하지 않는 이미지 모델: ' + modelKey);

        var input = model.inputBuilder(opts.prompt, opts);
        var rawUrl;
        if(model.provider === 'replicate') rawUrl = await callReplicate(model.modelId, input, opts);
        else if(model.provider === 'fal') rawUrl = await callFal(model.modelId, input, opts);
        else if(model.provider === 'openai') rawUrl = await callOpenAI(input);
        else throw new Error('알 수 없는 프로바이더: ' + model.provider);

        // Supabase Storage에 영구 저장 (Instagram 등 발행 시 필요)
        var finalUrl = opts.skipStorage ? rawUrl : await persistToStorage(rawUrl, 'image');
        return {url: finalUrl, model: modelKey, provider: model.provider, originalUrl: rawUrl};
    }

    async function generateVideo(opts){
        opts = opts || {};
        if(!opts.prompt) throw new Error('prompt 필수');
        var modelKey = opts.model || getAIConfig().defaultVideoModel || 'pika-2.0';
        var model = VIDEO_MODELS[modelKey];
        if(!model) throw new Error('지원하지 않는 영상 모델: ' + modelKey);

        var input = model.inputBuilder(opts.prompt, opts);
        var rawUrl;
        if(model.provider === 'replicate') rawUrl = await callReplicate(model.modelId, input, opts);
        else if(model.provider === 'fal') rawUrl = await callFal(model.modelId, input, opts);
        else throw new Error('알 수 없는 영상 프로바이더: ' + model.provider);

        var finalUrl = opts.skipStorage ? rawUrl : await persistToStorage(rawUrl, 'video');
        return {url: finalUrl, model: modelKey, provider: model.provider, originalUrl: rawUrl};
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

    // ─── 비용 추정 ───
    function estimateCost(type, modelKey, opts){
        opts = opts || {};
        var m = (type === 'image' ? IMAGE_MODELS : VIDEO_MODELS)[modelKey];
        if(!m) return null;
        if(type === 'image') return m.costPerImage || 0;
        return (m.costPerSecond || 0) * (opts.duration || 5);
    }

    // ─── 프롬프트 도우미 ───
    function buildSnsPrompt(text, opts){
        opts = opts || {};
        var style = opts.style || 'photographic';
        var platformHint = '';
        if(opts.platform === 'instagram') platformHint = ', Instagram-friendly composition, vibrant colors';
        else if(opts.platform === 'tiktok') platformHint = ', dynamic energy, viral aesthetic';
        else if(opts.platform === 'xiaohongshu') platformHint = ', soft pastel tones, lifestyle aesthetic, Asian beauty';
        return text + platformHint + ', high quality, professional ' + style + ', ' + (opts.aspect || '1:1') + ' aspect ratio';
    }

    // 글로벌 노출
    window.SNSAI = {
        generateImage: generateImage,
        generateVideo: generateVideo,
        listImageModels: listImageModels,
        listVideoModels: listVideoModels,
        estimateCost: estimateCost,
        buildSnsPrompt: buildSnsPrompt,
        IMAGE_MODELS: IMAGE_MODELS,
        VIDEO_MODELS: VIDEO_MODELS
    };
})();
