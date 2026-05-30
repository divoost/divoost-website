/**
 * DIVOOST SNS Platform - Secure Storage Utility
 *
 * localStorage에 저장된 SNS 토큰의 만료/스윕 관리.
 * XSS 발생 시 탈취 위험을 줄이기 위해:
 *  1. 모든 토큰에 만료 시간(_savedAt) 부착
 *  2. 만료 시간 초과 시 자동 삭제
 *  3. 만료 임박 시 사용자에게 알림
 *
 * ⚠️ 이건 강한 암호화가 아닙니다 (브라우저에선 강한 암호화 불가능).
 *    XSS 노출 창(window)을 줄이는 시간 기반 보호입니다.
 *    장기적으론 SNS 토큰도 백엔드 프록시로 이전 권장.
 */
(function () {
    'use strict';

    var SETTINGS_KEY = 'snsAuthSession';
    var SNS_SETTINGS_KEY = 'snsSettings';

    // 토큰 종류별 TTL (ms)
    // Facebook 단기 토큰이 ~24h라 보수적으로 48h 설정
    var TTL = {
        FB_PAGE_TOKEN: 48 * 60 * 60 * 1000,   // 48시간
        IG_TOKEN: 48 * 60 * 60 * 1000,        // FB Token 기반이므로 동일
        DEFAULT: 60 * 24 * 60 * 60 * 1000     // 60일 (장기 SNS 토큰 가정)
    };

    var WARNING_THRESHOLD = 2 * 60 * 60 * 1000; // 2시간 남으면 경고

    function getSnsSettings() {
        try {
            return JSON.parse(localStorage.getItem(SNS_SETTINGS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveSnsSettings(settings) {
        try {
            localStorage.setItem(SNS_SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('[SecureStorage] 저장 실패', e);
        }
    }

    function getTtlForAccount(channelId) {
        if (channelId === 'facebook') return TTL.FB_PAGE_TOKEN;
        if (channelId === 'instagram') return TTL.IG_TOKEN;
        return TTL.DEFAULT;
    }

    function hasAnyToken(account) {
        return !!(
            (account.accessToken && account.accessToken.trim()) ||
            (account.pageToken && account.pageToken.trim())
        );
    }

    /**
     * 모든 토큰 보유 계정에 _savedAt 기록 (없으면 추가).
     * settings.html에서 저장 시 호출.
     */
    function markTokenAge(channelId, accountId) {
        var settings = getSnsSettings();
        var ch = settings[channelId];
        if (!ch || !ch.accounts) return;

        var account = ch.accounts.find(function (a) {
            return a.id === accountId;
        });
        if (!account) return;

        if (hasAnyToken(account)) {
            account._savedAt = Date.now();
            saveSnsSettings(settings);
        }
    }

    /**
     * 모든 채널/계정 일괄 스윕.
     * 만료된 토큰만 삭제 (계정 자체는 유지 - 메타 정보 보존).
     * @returns {Array} 삭제된 항목 리스트 [{channel, account, hoursOver}]
     */
    function sweepExpired() {
        var settings = getSnsSettings();
        var removed = [];
        var changed = false;
        var now = Date.now();

        Object.keys(settings).forEach(function (channelId) {
            var ch = settings[channelId];
            if (!ch || !ch.accounts) return;

            var ttl = getTtlForAccount(channelId);

            ch.accounts.forEach(function (account) {
                if (!hasAnyToken(account)) return;
                if (!account._savedAt) {
                    // 옛 데이터 - 지금부터 카운트
                    account._savedAt = now;
                    changed = true;
                    return;
                }

                var age = now - account._savedAt;
                if (age > ttl) {
                    // 만료 - 토큰만 비우고 메타는 유지
                    if (account.accessToken) account.accessToken = '';
                    if (account.pageToken) account.pageToken = '';
                    removed.push({
                        channel: channelId,
                        account: account.name || account.id,
                        hoursOver: Math.round((age - ttl) / (60 * 60 * 1000))
                    });
                    changed = true;
                }
            });
        });

        if (changed) saveSnsSettings(settings);
        return removed;
    }

    /**
     * 만료 임박 계정 리스트 (2시간 이내).
     */
    function getExpiringSoon() {
        var settings = getSnsSettings();
        var soon = [];
        var now = Date.now();

        Object.keys(settings).forEach(function (channelId) {
            var ch = settings[channelId];
            if (!ch || !ch.accounts) return;

            var ttl = getTtlForAccount(channelId);

            ch.accounts.forEach(function (account) {
                if (!hasAnyToken(account) || !account._savedAt) return;

                var age = now - account._savedAt;
                var remaining = ttl - age;
                if (remaining > 0 && remaining < WARNING_THRESHOLD) {
                    soon.push({
                        channel: channelId,
                        account: account.name || account.id,
                        remainingMinutes: Math.floor(remaining / 60000)
                    });
                }
            });
        });

        return soon;
    }

    /**
     * 특정 계정의 남은 시간 (ms). 없으면 null.
     */
    function getRemainingMs(channelId, accountId) {
        var settings = getSnsSettings();
        var ch = settings[channelId];
        if (!ch || !ch.accounts) return null;
        var account = ch.accounts.find(function (a) {
            return a.id === accountId;
        });
        if (!account || !hasAnyToken(account) || !account._savedAt) return null;

        var ttl = getTtlForAccount(channelId);
        return ttl - (Date.now() - account._savedAt);
    }

    function formatRemaining(ms) {
        if (ms == null) return '-';
        if (ms <= 0) return '만료됨';
        var hours = Math.floor(ms / (60 * 60 * 1000));
        var minutes = Math.floor((ms % (60 * 60 * 1000)) / 60000);
        if (hours >= 24) return Math.floor(hours / 24) + '일 ' + (hours % 24) + '시간';
        if (hours >= 1) return hours + '시간 ' + minutes + '분';
        return minutes + '분';
    }

    /**
     * 인증 세션 (snsAuthSession) 만료 확인 + 정리.
     * auth-guard.js와 보완 관계.
     */
    function isAuthSessionExpired() {
        try {
            var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (!s || !s.expires_at) return true;
            return s.expires_at * 1000 < Date.now();
        } catch (e) {
            return true;
        }
    }

    // 글로벌 노출
    window.SNSSecureStorage = {
        markTokenAge: markTokenAge,
        sweepExpired: sweepExpired,
        getExpiringSoon: getExpiringSoon,
        getRemainingMs: getRemainingMs,
        formatRemaining: formatRemaining,
        isAuthSessionExpired: isAuthSessionExpired,
        TTL: TTL,
        WARNING_THRESHOLD: WARNING_THRESHOLD
    };
})();
