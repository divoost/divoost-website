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

    // ─── Contact form: Supabase DB 저장 + mailto 백업 (백엔드 + 이메일 듀얼 방식) ───
    var form = document.getElementById('contactForm');
    if (form) {
        // Supabase 클라이언트 (DB 저장용)
        var ETH_SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
        var ETH_SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var lang = localStorage.getItem('eth_lang') || 'en';
            var fd = new FormData(form);
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

            var submitBtn = form.querySelector('button[type="submit"]');
            var origText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = lang === 'zh' ? '提交中...' : 'Submitting...';
            }

            // 1) Supabase 'eth_inquiries' 테이블에 저장 (백엔드 백업)
            var inquiry = {
                name: pick('name'),
                company: pick('company'),
                phone: pick('phone'),
                email: pick('email'),
                service: pick('service'),
                market: pick('market'),
                budget: pick('budget'),
                source: pick('source'),
                message: pick('message'),
                lang: lang,
                user_agent: navigator.userAgent,
                referer: document.referrer
            };

            fetch(ETH_SUPABASE_URL + '/rest/v1/eth_inquiries', {
                method: 'POST',
                headers: {
                    'apikey': ETH_SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(inquiry)
            }).catch(function(err) {
                console.warn('Supabase save failed (테이블 없을 수 있음):', err);
            });

            // 2) localStorage 백업
            try {
                var inquiries = JSON.parse(localStorage.getItem('eztradehub_inquiries') || '[]');
                inquiries.push({ ts: new Date().toISOString(), data: data });
                localStorage.setItem('eztradehub_inquiries', JSON.stringify(inquiries));
            } catch (err) {}

            // 3) 이메일 본문 (다국어)
            var labels = lang === 'zh' ? {
                title: '※ EZ TRADE HUB 咨询申请 ※',
                applicant: '■ 申请人信息',
                name: '姓名', company: '公司', phone: '电话', email: '邮箱',
                service: '■ 关注服务', market: '■ 目标市场',
                budget: '■ 预算', source: '■ 来源', msg: '■ 详细内容',
                received: '接收时间'
            } : {
                title: '※ EZ TRADE HUB Inquiry ※',
                applicant: '■ Applicant Info',
                name: 'Name', company: 'Company', phone: 'Phone', email: 'Email',
                service: '■ Service Interest', market: '■ Target Market',
                budget: '■ Budget', source: '■ Source', msg: '■ Message',
                received: 'Received'
            };

            var lines = [
                labels.title, '',
                labels.applicant,
                labels.name + ': ' + pick('name'),
                labels.company + ': ' + pick('company'),
                labels.phone + ': ' + pick('phone'),
                labels.email + ': ' + pick('email'), '',
                labels.service, pick('service'), '',
                labels.market, pick('market'), '',
                labels.budget, pick('budget'), '',
                labels.source, pick('source'), '',
                labels.msg, pick('message'), '',
                '────────────────',
                labels.received + ': ' + new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')
            ];
            var body = lines.join('\n');
            var subject = '[EZ TRADE HUB] ' + pick('company') + ' / ' + pick('name');

            var mailto = 'mailto:shandongyiji_88@163.com'
                + '?subject=' + encodeURIComponent(subject)
                + '&body=' + encodeURIComponent(body);

            // 4) 메일 클라이언트 실행
            setTimeout(function() {
                window.location.href = mailto;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = origText;
                }
            }, 400);

            var msg = form.querySelector('.form-msg');
            if (msg) {
                msg.style.display = 'block';
                msg.textContent = lang === 'zh'
                    ? '✅ 邮件客户端已打开。请点击发送完成咨询申请。(如未自动打开,请直接发送至 shandongyiji_88@163.com)'
                    : '✅ Email client opened. Please click Send to complete your inquiry. (If it didn\'t open, please send to shandongyiji_88@163.com directly)';
                msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
