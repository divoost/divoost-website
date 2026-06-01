/* EZ TRADE HUB - Common JS */
(function() {
    'use strict';

    // ─── Navigation: scroll background + mobile burger ───
    var nav = document.querySelector('.nav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 8) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        }, { passive: true });
    }

    var burger = document.querySelector('.nav-burger');
    var mobile = document.querySelector('.nav-mobile');
    if (burger && mobile) {
        burger.addEventListener('click', function() {
            mobile.classList.toggle('open');
            burger.setAttribute('aria-expanded', mobile.classList.contains('open'));
        });
        // close on link click
        mobile.querySelectorAll('a').forEach(function(a) {
            a.addEventListener('click', function() {
                mobile.classList.remove('open');
            });
        });
    }

    // ─── Counter up animation ───
    function animateCounter(el) {
        var target = parseFloat(el.getAttribute('data-target')) || 0;
        var duration = parseInt(el.getAttribute('data-duration')) || 1600;
        var decimals = parseInt(el.getAttribute('data-decimals')) || 0;
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var startTime = null;
        function tick(t) {
            if (!startTime) startTime = t;
            var progress = Math.min((t - startTime) / duration, 1);
            // ease-out
            var eased = 1 - Math.pow(1 - progress, 3);
            var value = target * eased;
            el.textContent = prefix + value.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ─── Intersection observer for reveal + counters ───
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    var counters = entry.target.querySelectorAll('[data-target]');
                    counters.forEach(function(c) {
                        if (!c.dataset._done) {
                            animateCounter(c);
                            c.dataset._done = '1';
                        }
                    });
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.reveal, [data-counter-section]').forEach(function(el) {
            io.observe(el);
        });
    } else {
        // fallback: show all + run all counters immediately
        document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('in'); });
        document.querySelectorAll('[data-target]').forEach(animateCounter);
    }

    // ─── Smooth scroll for hash links ───
    document.addEventListener('click', function(e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        var target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: top, behavior: 'smooth' });
        }
    });

    // ─── Contact form: mailto 발송 (정적 사이트용 - 백엔드 없이 이메일로 받기) ───
    var form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(form);
            // 다중 선택 (service[], market[]) 묶기
            var data = {};
            fd.forEach(function(v, k) {
                if (data[k]) {
                    if (Array.isArray(data[k])) data[k].push(v);
                    else data[k] = [data[k], v];
                } else { data[k] = v; }
            });

            function pick(k) {
                var v = data[k];
                if (v == null) return '-';
                return Array.isArray(v) ? v.join(', ') : String(v);
            }

            // 이메일 본문 구성
            var lines = [
                '※ EZ TRADE HUB 상담 신청 ※',
                '',
                '■ 신청자 정보',
                '이름: ' + pick('name'),
                '기업명: ' + pick('company'),
                '연락처: ' + pick('phone'),
                '이메일: ' + pick('email'),
                '',
                '■ 관심 서비스',
                pick('service'),
                '',
                '■ 진출 희망 시장',
                pick('market'),
                '',
                '■ 예상 예산',
                pick('budget'),
                '',
                '■ 유입 경로',
                pick('source'),
                '',
                '■ 문의 내용',
                pick('message'),
                '',
                '────────────────',
                '접수 시각: ' + new Date().toLocaleString('ko-KR')
            ];
            var body = lines.join('\n');
            var subject = '[EZ TRADE HUB 상담신청] ' + pick('company') + ' / ' + pick('name');

            var mailto = 'mailto:shandongyiji_88@163.com'
                + '?subject=' + encodeURIComponent(subject)
                + '&body=' + encodeURIComponent(body);

            // 로그 백업 (브라우저 종료 시에도 추적 가능하게)
            try {
                var inquiries = JSON.parse(localStorage.getItem('eztradehub_inquiries') || '[]');
                inquiries.push({ ts: new Date().toISOString(), data: data });
                localStorage.setItem('eztradehub_inquiries', JSON.stringify(inquiries));
            } catch (err) {
                console.warn('localStorage save failed:', err);
            }

            // 이메일 클라이언트 실행
            window.location.href = mailto;

            var msg = form.querySelector('.form-msg');
            if (msg) {
                msg.style.display = 'block';
                msg.textContent = '✅ 이메일 클라이언트가 열렸습니다. 발송 버튼을 눌러 상담신청을 완료해 주세요. (자동으로 열리지 않으면 shandongyiji_88@163.com 으로 직접 보내주세요)';
            }
        });
    }

    // ─── Language toggle (en / zh) - 영어 기본 + 중국어 토글 ───
    var langButtons = document.querySelectorAll('[data-lang-switch]');
    var current = localStorage.getItem('eth_lang') || 'en';
    function applyLang(lang) {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        // 텍스트 노드 교체: data-en 이 있는 요소는 영어 기본, data-zh 가 있으면 중국어로 토글
        document.querySelectorAll('[data-en]').forEach(function(el) {
            var en = el.getAttribute('data-en');
            var zh = el.getAttribute('data-zh');
            // innerHTML 사용: 일부 텍스트에 <br>, <span> 등 포함 가능
            if (lang === 'zh' && zh) el.innerHTML = zh;
            else el.innerHTML = en;
        });
        langButtons.forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-lang-switch') === lang);
        });
        localStorage.setItem('eth_lang', lang);
    }
    applyLang(current);
    langButtons.forEach(function(b) {
        b.addEventListener('click', function() {
            applyLang(b.getAttribute('data-lang-switch'));
        });
    });
})();
