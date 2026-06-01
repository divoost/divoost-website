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

    // ─── Contact form (메인 + 문의 페이지 공통) ───
    var form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(form);
            var data = {};
            fd.forEach(function(v, k) {
                if (data[k]) {
                    if (Array.isArray(data[k])) data[k].push(v);
                    else data[k] = [data[k], v];
                } else { data[k] = v; }
            });
            // 데모: localStorage 저장 + 안내 (실서비스는 백엔드 / 이메일 / DB 연동)
            try {
                var inquiries = JSON.parse(localStorage.getItem('eztradehub_inquiries') || '[]');
                inquiries.push({ ts: new Date().toISOString(), data: data });
                localStorage.setItem('eztradehub_inquiries', JSON.stringify(inquiries));
            } catch (err) {
                console.warn('localStorage save failed:', err);
            }
            var msg = form.querySelector('.form-msg');
            if (msg) {
                msg.style.display = 'block';
                msg.textContent = '✅ 상담신청이 접수되었습니다. 1영업일 이내에 연락드리겠습니다.';
            }
            form.reset();
        });
    }

    // ─── Language toggle (ko / zh) ───
    var langButtons = document.querySelectorAll('[data-lang-switch]');
    var current = localStorage.getItem('eth_lang') || 'ko';
    function applyLang(lang) {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-ko]').forEach(function(el) {
            var ko = el.getAttribute('data-ko');
            var zh = el.getAttribute('data-zh');
            el.textContent = lang === 'zh' && zh ? zh : ko;
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
