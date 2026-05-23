/* ============================================================
   EZCOMET Common JavaScript
   Cross-Border E-Commerce Platform for Southeast Asian Markets
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ----------------------------------------------------------
     Mobile Menu Toggle
     ---------------------------------------------------------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const navOverlay = document.querySelector('.nav-overlay');
  const navLinks = document.querySelectorAll('.nav-link');

  function openMenu() {
    menuToggle.classList.add('active');
    nav.classList.add('active');
    navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menuToggle.classList.remove('active');
    nav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (nav.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeMenu);
  }

  // Close mobile menu when a nav link is clicked
  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* ----------------------------------------------------------
     Header Scroll Effect
     ---------------------------------------------------------- */
  const header = document.querySelector('.header');
  let lastScrollY = 0;

  function handleHeaderScroll() {
    var scrollY = window.scrollY || window.pageYOffset;

    if (header) {
      if (scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll(); // run once on load

  /* ----------------------------------------------------------
     Smooth Scroll for Anchor Links
     ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var headerHeight = header ? header.offsetHeight : 0;
        var targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ----------------------------------------------------------
     Active Nav Link Based on Current Page
     ---------------------------------------------------------- */
  function setActiveNavLink() {
    var currentPath = window.location.pathname;
    var currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

    // Normalize empty or root to index.html
    if (currentPage === '' || currentPage === '/') {
      currentPage = 'index.html';
    }

    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPage = href.substring(href.lastIndexOf('/') + 1);

      link.classList.remove('active');

      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    });
  }

  setActiveNavLink();

  /* ----------------------------------------------------------
     Scroll Animation Observer (fade-in-up)
     ---------------------------------------------------------- */
  var animatedElements = document.querySelectorAll('.fade-in-up');

  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    var animationObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          animationObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    animatedElements.forEach(function (el) {
      animationObserver.observe(el);
    });
  } else {
    // Fallback: show all elements immediately
    animatedElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ----------------------------------------------------------
     Counter Animation for Stats Numbers
     Usage: <span class="counter" data-target="1500" data-suffix="+">0</span>
     ---------------------------------------------------------- */
  function animateCounter(element) {
    var target = parseInt(element.getAttribute('data-target'), 10);
    var suffix = element.getAttribute('data-suffix') || '';
    var prefix = element.getAttribute('data-prefix') || '';
    var duration = 2000; // ms
    var startTime = null;

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var easedProgress = easeOutQuart(progress);
      var current = Math.floor(easedProgress * target);

      element.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = prefix + target.toLocaleString() + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  var counterElements = document.querySelectorAll('.counter');

  if ('IntersectionObserver' in window && counterElements.length > 0) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });

    counterElements.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  /* ----------------------------------------------------------
     Back to Top Button
     ---------------------------------------------------------- */
  var backToTop = document.querySelector('.back-to-top');

  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* ----------------------------------------------------------
     Close mobile menu on window resize to desktop
     ---------------------------------------------------------- */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024 && nav && nav.classList.contains('active')) {
      closeMenu();
    }
  });

  /* ----------------------------------------------------------
     Hero Slider
     ---------------------------------------------------------- */
  var heroSlider = document.getElementById('heroSlider');
  if (heroSlider) {
    var slides = heroSlider.querySelectorAll('.hero-slide');
    var dots = document.querySelectorAll('.hero-dot');
    var progressBar = document.getElementById('heroProgressBar');
    var prevBtn = document.getElementById('heroPrev');
    var nextBtn = document.getElementById('heroNext');
    var currentSlide = 0;
    var slideCount = slides.length;
    var interval = 2500;
    var timer = null;
    var progressTimer = null;
    var progressStart = 0;

    function goToSlide(index) {
      slides[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      currentSlide = (index + slideCount) % slideCount;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
      resetProgress();
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function prevSlide() {
      goToSlide(currentSlide - 1);
    }

    function resetProgress() {
      if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        progressBar.offsetHeight;
        progressBar.style.transition = 'width ' + interval + 'ms linear';
        progressBar.style.width = '100%';
      }
      clearInterval(timer);
      timer = setInterval(nextSlide, interval);
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { goToSlide(currentSlide + 1); });
    if (prevBtn) prevBtn.addEventListener('click', function () { goToSlide(currentSlide - 1); });

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        goToSlide(parseInt(this.getAttribute('data-slide')));
      });
    });

    heroSlider.addEventListener('mouseenter', function () {
      clearInterval(timer);
      if (progressBar) progressBar.style.animationPlayState = 'paused';
    });

    heroSlider.addEventListener('mouseleave', function () {
      resetProgress();
    });

    var touchStartX = 0;
    heroSlider.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    heroSlider.addEventListener('touchend', function (e) {
      var diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff < 0) nextSlide();
        else prevSlide();
      }
    }, { passive: true });

    resetProgress();
  }

});
