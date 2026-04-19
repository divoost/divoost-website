// =========================================
// DIVOOST Main JavaScript
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // =====================
    // Header Scroll Effect
    // =====================
    const header = document.getElementById('header');
    let lastScrollY = window.scrollY;

    function handleScroll() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // =====================
    // Mobile Menu Toggle
    // =====================
    const mobileToggle = document.getElementById('mobileToggle');
    const navMobile = document.getElementById('navMobile');

    if (mobileToggle && navMobile) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMobile.classList.toggle('active');
        });

        // Close menu on link click
        navMobile.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMobile.classList.remove('active');
            });
        });
    }

    // =====================
    // Smooth Scroll for Anchor Links
    // =====================
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

    // =====================
    // Intersection Observer for Animations
    // =====================
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

    // Observe sections and cards
    const animatedElements = document.querySelectorAll(
        '.section-header, .company-grid, .business-card, .cert-item, .offline-feature, .marketing-card, .contact-grid'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
    });

    // Add CSS for in-view state
    const style = document.createElement('style');
    style.textContent = `
        .in-view {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        .business-card.in-view:nth-child(1) { transition-delay: 0s; }
        .business-card.in-view:nth-child(2) { transition-delay: 0.15s; }
        .business-card.in-view:nth-child(3) { transition-delay: 0.3s; }

        .cert-item.in-view:nth-child(1) { transition-delay: 0s; }
        .cert-item.in-view:nth-child(2) { transition-delay: 0.1s; }
        .cert-item.in-view:nth-child(3) { transition-delay: 0.2s; }
        .cert-item.in-view:nth-child(4) { transition-delay: 0.3s; }

        .offline-feature.in-view:nth-child(1) { transition-delay: 0s; }
        .offline-feature.in-view:nth-child(2) { transition-delay: 0.1s; }
        .offline-feature.in-view:nth-child(3) { transition-delay: 0.2s; }
        .offline-feature.in-view:nth-child(4) { transition-delay: 0.3s; }

        .marketing-card.in-view:nth-child(1) { transition-delay: 0s; }
        .marketing-card.in-view:nth-child(2) { transition-delay: 0.1s; }
        .marketing-card.in-view:nth-child(3) { transition-delay: 0.2s; }
        .marketing-card.in-view:nth-child(4) { transition-delay: 0.3s; }
    `;
    document.head.appendChild(style);

    // =====================
    // Contact Form Handling
    // =====================
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = contactForm.name.value;
            const email = contactForm.email.value;
            const company = contactForm.company.value;
            const message = contactForm.message.value;

            // Build mailto link as a simple, no-backend solution
            const subject = encodeURIComponent(`[DIVOOST Inquiry] ${company || name}`);
            const body = encodeURIComponent(
                `Name: ${name}\n` +
                `Email: ${email}\n` +
                `Company: ${company}\n\n` +
                `Message:\n${message}`
            );

            window.location.href = `mailto:bizpro@divoost.com?subject=${subject}&body=${body}`;
        });
    }

    // =====================
    // Active Nav Link on Scroll
    // =====================
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

// =====================
// Active nav link style injection
// =====================
const navStyle = document.createElement('style');
navStyle.textContent = `
    .nav-link.active {
        color: var(--color-gold) !important;
    }
    .nav-link.active::after {
        width: calc(100% - 32px) !important;
    }
`;
document.head.appendChild(navStyle);
