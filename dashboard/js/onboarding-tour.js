/* DIVOOST Onboarding Tour - Leviosa-style 5-step walkthrough
 * Usage:
 *   <script src="path/to/onboarding-tour.js"></script>
 *   DivoostTour.start([
 *     { target:'#searchBar', title:'검색', body:'키워드 입력 후 검색하세요.' },
 *     { target:'#resultList', title:'결과', body:'좌측 목록에서 상품을 선택하세요.' },
 *     ...
 *   ], { storageKey: 'divoost_tour_dashboard_v1' });
 *
 * - 5단계 walkthrough (가변)
 * - Skip tour / Back / Next
 * - 화살표 키 (← →) 지원
 * - 첫 방문 시 자동 시작 (localStorage 체크)
 */
(function(global){
    'use strict';

    var TOUR_CSS = '\
        .div-tour-mask{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99998;backdrop-filter:blur(2px);transition:opacity .25s}\
        .div-tour-hole{position:fixed;border-radius:10px;box-shadow:0 0 0 9999px rgba(15,23,42,.55),0 0 0 4px rgba(139,92,246,.55);transition:all .35s cubic-bezier(.4,0,.2,1);z-index:99999;pointer-events:none}\
        .div-tour-popover{position:fixed;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,.32);padding:22px 24px;width:340px;max-width:calc(100vw - 32px);z-index:100000;font-family:-apple-system,Inter,sans-serif;animation:divTourIn .32s cubic-bezier(.34,1.56,.64,1)}\
        @keyframes divTourIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}\
        .div-tour-popover .dt-close{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;border:none;background:#f1f5f9;color:#64748b;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}\
        .div-tour-popover .dt-close:hover{background:#e2e8f0;color:#0f172a}\
        .div-tour-popover .dt-title{font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:8px;letter-spacing:-.01em}\
        .div-tour-popover .dt-body{font-size:.85rem;line-height:1.55;color:#475569;margin-bottom:16px}\
        .div-tour-popover .dt-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}\
        .div-tour-popover .dt-skip{background:none;border:none;color:#94a3b8;font-size:.78rem;font-weight:600;cursor:pointer;padding:6px 0}\
        .div-tour-popover .dt-skip:hover{color:#64748b}\
        .div-tour-popover .dt-dots{display:flex;gap:5px;align-items:center}\
        .div-tour-popover .dt-dot{width:6px;height:6px;border-radius:50%;background:#e2e8f0;transition:all .25s}\
        .div-tour-popover .dt-dot.active{background:#8b5cf6;width:18px;border-radius:3px}\
        .div-tour-popover .dt-actions{display:flex;gap:6px}\
        .div-tour-popover .dt-back,.div-tour-popover .dt-next{padding:8px 16px;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;border:none;transition:all .15s}\
        .div-tour-popover .dt-back{background:#f1f5f9;color:#475569}\
        .div-tour-popover .dt-back:hover{background:#e2e8f0}\
        .div-tour-popover .dt-next{background:#8b5cf6;color:#fff;min-width:60px}\
        .div-tour-popover .dt-next:hover{background:#7c3aed;box-shadow:0 4px 12px rgba(139,92,246,.32)}\
        .div-tour-popover .dt-keys{font-size:.7rem;color:#cbd5e1;text-align:center;margin-top:8px;letter-spacing:.02em}\
    ';

    var Tour = {
        steps: [],
        current: 0,
        storageKey: null,
        mask: null,
        hole: null,
        popover: null,
        keyHandler: null,
        onFinish: null,

        injectCss: function(){
            if(document.getElementById('div-tour-css')) return;
            var s = document.createElement('style');
            s.id = 'div-tour-css';
            s.textContent = TOUR_CSS;
            document.head.appendChild(s);
        },

        // start(steps, options)
        //   steps: [{ target:'selector' or null (centered), title, body, placement?:'top'|'bottom'|'left'|'right'|'center' }]
        //   options: { storageKey, force, onFinish }
        start: function(steps, options){
            options = options || {};
            this.storageKey = options.storageKey || null;
            this.onFinish = options.onFinish || null;
            // Skip if already completed (unless forced)
            if(!options.force && this.storageKey){
                try { if(localStorage.getItem(this.storageKey) === '1') return; } catch(_){}
            }
            this.steps = steps || [];
            if(this.steps.length === 0) return;
            this.current = 0;
            this.injectCss();
            this.render();
            var self = this;
            this.keyHandler = function(e){
                if(e.key === 'ArrowRight' || e.key === 'Enter'){ e.preventDefault(); self.next(); }
                else if(e.key === 'ArrowLeft'){ e.preventDefault(); self.back(); }
                else if(e.key === 'Escape'){ e.preventDefault(); self.skip(); }
            };
            document.addEventListener('keydown', this.keyHandler);
        },

        render: function(){
            var step = this.steps[this.current];
            if(!step){ this.finish(true); return; }

            if(!this.mask){
                this.mask = document.createElement('div');
                this.mask.className = 'div-tour-mask';
                document.body.appendChild(this.mask);
            }
            if(!this.hole){
                this.hole = document.createElement('div');
                this.hole.className = 'div-tour-hole';
                document.body.appendChild(this.hole);
            }
            if(!this.popover){
                this.popover = document.createElement('div');
                this.popover.className = 'div-tour-popover';
                document.body.appendChild(this.popover);
            }

            // Hole position
            var target = step.target ? document.querySelector(step.target) : null;
            if(target){
                target.scrollIntoView({ block:'center', behavior:'smooth' });
                var rect = target.getBoundingClientRect();
                this.hole.style.display = 'block';
                this.hole.style.top = (rect.top - 6) + 'px';
                this.hole.style.left = (rect.left - 6) + 'px';
                this.hole.style.width = (rect.width + 12) + 'px';
                this.hole.style.height = (rect.height + 12) + 'px';
                this.placePopover(rect, step.placement);
            } else {
                this.hole.style.display = 'none';
                // Center popover
                this.popover.style.top = '50%';
                this.popover.style.left = '50%';
                this.popover.style.transform = 'translate(-50%,-50%)';
            }

            var dots = '';
            for(var i=0; i<this.steps.length; i++){
                dots += '<span class="dt-dot' + (i === this.current ? ' active' : '') + '"></span>';
            }

            var self = this;
            this.popover.innerHTML =
                '<button class="dt-close" aria-label="닫기">×</button>' +
                '<div class="dt-title">' + this.escapeHtml(step.title || '') + '</div>' +
                '<div class="dt-body">' + (step.body || '') + '</div>' +
                '<div class="dt-foot">' +
                    '<button class="dt-skip">건너뛰기</button>' +
                    '<div class="dt-dots">' + dots + '</div>' +
                    '<div class="dt-actions">' +
                        (this.current > 0 ? '<button class="dt-back">이전</button>' : '') +
                        '<button class="dt-next">' + (this.current === this.steps.length - 1 ? '완료' : '다음') + '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="dt-keys">← → 화살표 키 사용 가능</div>';

            this.popover.querySelector('.dt-close').onclick = function(){ self.skip(); };
            this.popover.querySelector('.dt-skip').onclick = function(){ self.skip(); };
            this.popover.querySelector('.dt-next').onclick = function(){ self.next(); };
            var bb = this.popover.querySelector('.dt-back');
            if(bb) bb.onclick = function(){ self.back(); };
        },

        placePopover: function(rect, placement){
            placement = placement || 'auto';
            var pop = this.popover;
            pop.style.transform = '';
            // Default: place below; if no room, place above
            var spaceBelow = window.innerHeight - rect.bottom;
            var spaceAbove = rect.top;
            var popH = 200; // approx
            var popW = 340;

            var top, left;
            if(placement === 'top' || (placement === 'auto' && spaceBelow < popH + 16 && spaceAbove > spaceBelow)){
                top = Math.max(12, rect.top - popH - 16);
            } else {
                top = Math.min(window.innerHeight - popH - 12, rect.bottom + 16);
            }
            left = Math.max(12, Math.min(window.innerWidth - popW - 12, rect.left + rect.width / 2 - popW / 2));
            pop.style.top = top + 'px';
            pop.style.left = left + 'px';
        },

        next: function(){
            if(this.current >= this.steps.length - 1) return this.finish(true);
            this.current++;
            this.render();
        },

        back: function(){
            if(this.current === 0) return;
            this.current--;
            this.render();
        },

        skip: function(){ this.finish(false); },

        finish: function(completed){
            if(this.mask){ this.mask.remove(); this.mask = null; }
            if(this.hole){ this.hole.remove(); this.hole = null; }
            if(this.popover){ this.popover.remove(); this.popover = null; }
            if(this.keyHandler){ document.removeEventListener('keydown', this.keyHandler); this.keyHandler = null; }
            if(this.storageKey){
                try { localStorage.setItem(this.storageKey, '1'); } catch(_){}
            }
            if(typeof this.onFinish === 'function'){
                try { this.onFinish(completed); } catch(err){ console.error('Tour onFinish error', err); }
            }
        },

        // Reset for testing
        reset: function(key){
            try { localStorage.removeItem(key || this.storageKey); } catch(_){}
        },

        escapeHtml: function(s){
            return String(s).replace(/[&<>"']/g, function(c){
                return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
            });
        }
    };

    global.DivoostTour = Tour;
})(window);
