/* ChatsSync site — small, dependency-free */
(function () {
  'use strict';
  var CFG = window.CS_CFG || {};
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia && w.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // old one-page links (#privacy, #pricing ...) -> real pages
  var map = { privacy: '/privacy/', terms: '/terms/', pricing: '/pricing/', features: '/features/', agency: '/', home: '/' };
  var h = (location.hash || '').slice(1);
  if (location.pathname === '/' && map[h] && map[h] !== '/') { location.replace(map[h]); return; }

  // nav
  var nav = d.getElementById('nav');
  var onScroll = function () { nav && nav.classList.toggle('scrolled', w.scrollY > 20); };
  onScroll(); w.addEventListener('scroll', onScroll, { passive: true });
  var burger = d.getElementById('burger');
  if (burger) burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  d.querySelectorAll('.mnav a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });

  // reveal on scroll
  var rv = d.querySelectorAll('.rv,.rv-3d');
  if ('IntersectionObserver' in w && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  // hero: product screen starts tilted in 3D and flattens as you scroll (sharp at rest)
  var scene = d.getElementById('scene');
  if (scene && !reduce) {
    var stage = scene.parentNode, ticking = false;
    var upd = function () {
      ticking = false;
      var r = stage.getBoundingClientRect(), vh = w.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      var tilt = 16 * (1 - p);
      scene.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
      scene.style.setProperty('--sc', (0.94 + 0.06 * p).toFixed(4));
    };
    upd();
    w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    w.addEventListener('resize', upd);
  }

  // overview video
  var vb = d.querySelector('.vid');
  if (vb) {
    var vid = vb.querySelector('video'), pb = vb.querySelector('.vid-play');
    pb.addEventListener('click', function () { vb.classList.add('playing'); vid.play(); });
    vid.addEventListener('play', function () {
      vb.classList.add('playing');
      try { if (w.gtag) w.gtag('event', 'video_start', { video_title: 'ChatsSync overview' }); } catch (x) {}
      try { if (w.fbq) w.fbq('trackCustom', 'VideoPlay'); } catch (x) {}
    }, { once: true });
  }

  // card spotlight
  if (fine) d.querySelectorAll('.fc').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // product tour
  d.querySelectorAll('.tour').forEach(function (t) {
    var tabs = t.querySelectorAll('.tab'), panes = t.querySelectorAll('.tp'), imgs = t.querySelectorAll('.shots img');
    var i = 0, timer = 0, DUR = 7000, seen = false;
    function show(n, user) {
      i = n;
      tabs.forEach(function (b, k) { b.setAttribute('aria-selected', k === n ? 'true' : 'false'); b.tabIndex = k === n ? 0 : -1; });
      panes.forEach(function (p, k) { p.classList.toggle('on', k === n); });
      imgs.forEach(function (im, k) { im.classList.toggle('on', k === n); });
      if (user) { t.classList.add('paused'); clearTimeout(timer); timer = 0; tabs[n].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
      else schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (reduce || t.classList.contains('paused')) return;
      timer = setTimeout(function () { show((i + 1) % tabs.length); }, DUR);
    }
    tabs.forEach(function (b, k) {
      b.style.setProperty('--dur', DUR + 'ms');
      b.addEventListener('click', function () { show(k, true); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); var n = (k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; show(n, true); tabs[n].focus();
        }
      });
    });
    // start autoplay only when visible; preload other shots once
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (!seen) { seen = true; imgs.forEach(function (im) { im.loading = 'eager'; }); } show(i); }
          else { clearTimeout(timer); }
        });
      }, { threshold: 0.35 }).observe(t);
    } else show(0);
  });

  // light / dark compare slider
  d.querySelectorAll('.cmp').forEach(function (c) {
    var inp = c.querySelector('input');
    var set = function (v) { c.style.setProperty('--pos', v + '%'); };
    inp.addEventListener('input', function () { set(inp.value); });
    if (!reduce && 'IntersectionObserver' in w) {
      var done = false;
      new IntersectionObserver(function (es) {
        if (done || !es[0].isIntersecting) return; done = true;
        var t0 = performance.now();
        (function step(t) {
          var p = Math.min(1, (t - t0) / 1800), v = 50 + Math.sin(p * Math.PI * 2) * 28 * (1 - p);
          set(v.toFixed(1)); inp.value = v; if (p < 1) requestAnimationFrame(step);
        })(t0);
      }, { threshold: 0.5 }).observe(c);
    }
  });

  // year
  d.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // lead tracking: every WhatsApp / call click
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/"],a[href^="tel:"]');
    if (!a) return;
    var label = a.getAttribute('data-lead') || 'general';
    var method = a.href.indexOf('tel:') === 0 ? 'phone' : 'whatsapp';
    try { if (w.gtag) w.gtag('event', 'generate_lead', { method: method, lead_source: label, page_path: location.pathname }); } catch (x) {}
    try { if (w.fbq) w.fbq('track', 'Contact', { content_name: label }); } catch (x) {}
    try { if (w.clarity) w.clarity('event', method + '_' + label); } catch (x) {}
  });

  // analytics — loaded after the page is interactive so the site stays fast
  function load(src, cb) { var s = d.createElement('script'); s.async = true; s.src = src; if (cb) s.onload = cb; d.head.appendChild(s); }
  function analytics() {
    if (CFG.ga) {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date()); w.gtag('config', CFG.ga);
      load('https://www.googletagmanager.com/gtag/js?id=' + CFG.ga);
    }
    if (CFG.clarity) {
      w.clarity = w.clarity || function () { (w.clarity.q = w.clarity.q || []).push(arguments); };
      load('https://www.clarity.ms/tag/' + CFG.clarity);
    }
    if (CFG.pixel) {
      var f = w.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      if (!w._fbq) w._fbq = f; f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      load('https://connect.facebook.net/en_US/fbevents.js');
      w.fbq('init', CFG.pixel); w.fbq('track', 'PageView');
    }
  }
  if (d.readyState === 'complete') setTimeout(analytics, 300);
  else w.addEventListener('load', function () { setTimeout(analytics, 300); });
})();
