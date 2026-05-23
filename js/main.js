document.addEventListener('DOMContentLoaded', () => {

    const header = document.getElementById('header');

    function handleScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    const mobileToggle = document.getElementById('mobileToggle');
    const navMobile = document.getElementById('navMobile');

    if (mobileToggle && navMobile) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMobile.classList.toggle('active');
        });

        navMobile.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMobile.classList.remove('active');
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
        '.section-header, .solution-card, .feature-item, .service-card, .market-item, .pricing-card, .case-card, .resource-card, .contact-grid, .cta-content'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
    });

    const style = document.createElement('style');
    style.textContent = `
        .in-view { opacity: 1 !important; transform: translateY(0) !important; }
        .solution-card.in-view:nth-child(1) { transition-delay: 0s; }
        .solution-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .solution-card.in-view:nth-child(3) { transition-delay: 0.2s; }
        .solution-card.in-view:nth-child(4) { transition-delay: 0.3s; }
        .feature-item.in-view:nth-child(1) { transition-delay: 0s; }
        .feature-item.in-view:nth-child(2) { transition-delay: 0.05s; }
        .feature-item.in-view:nth-child(3) { transition-delay: 0.1s; }
        .feature-item.in-view:nth-child(4) { transition-delay: 0.15s; }
        .feature-item.in-view:nth-child(5) { transition-delay: 0.2s; }
        .feature-item.in-view:nth-child(6) { transition-delay: 0.25s; }
        .feature-item.in-view:nth-child(7) { transition-delay: 0.3s; }
        .feature-item.in-view:nth-child(8) { transition-delay: 0.35s; }
        .service-card.in-view:nth-child(1) { transition-delay: 0s; }
        .service-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .service-card.in-view:nth-child(3) { transition-delay: 0.2s; }
        .service-card.in-view:nth-child(4) { transition-delay: 0.3s; }
        .pricing-card.in-view:nth-child(1) { transition-delay: 0s; }
        .pricing-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .pricing-card.in-view:nth-child(3) { transition-delay: 0.2s; }
        .pricing-card.in-view:nth-child(4) { transition-delay: 0.3s; }
        .case-card.in-view:nth-child(1) { transition-delay: 0s; }
        .case-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .case-card.in-view:nth-child(3) { transition-delay: 0.2s; }
        .resource-card.in-view:nth-child(1) { transition-delay: 0s; }
        .resource-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .resource-card.in-view:nth-child(3) { transition-delay: 0.2s; }
    `;
    document.head.appendChild(style);

    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = contactForm.name.value;
            const email = contactForm.email.value;
            const company = contactForm.company.value;
            const plan = contactForm.plan.value;
            const message = contactForm.message.value;

            const subject = encodeURIComponent(`[EZCOMET Inquiry] ${company || name}`);
            const body = encodeURIComponent(
                `Name: ${name}\n` +
                `Email: ${email}\n` +
                `Company: ${company}\n` +
                `Plan: ${plan}\n\n` +
                `Message:\n${message}`
            );

            window.location.href = `mailto:support@ezcomet.io?subject=${subject}&body=${body}`;
        });

        const trialBtn = document.getElementById('trialBtn');
        if (trialBtn) {
            trialBtn.addEventListener('click', () => {
                const name = contactForm.name.value;
                const email = contactForm.email.value;
                const company = contactForm.company.value;

                const subject = encodeURIComponent(`[EZCOMET Free Trial] ${company || name}`);
                const body = encodeURIComponent(
                    `Name: ${name}\n` +
                    `Email: ${email}\n` +
                    `Company: ${company}\n\n` +
                    `I would like to start a free trial of EZCOMET.`
                );

                window.location.href = `mailto:support@ezcomet.io?subject=${subject}&body=${body}`;
            });
        }
    }

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function highlightNavLink() {
        const scrollY = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNavLink, { passive: true });
    highlightNavLink();
});
