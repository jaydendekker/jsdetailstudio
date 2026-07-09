/* JS Detail Studio — main.js */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- Header: achtergrond na scrollen ----- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----- Mobiel menu ----- */
  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var closeMenu = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Menu openen");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ----- Fade-in bij scrollen ----- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reducedMotion) {
    var lastTime = 0;
    var stagger = 0;
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          // kleine stagger voor elementen die tegelijk binnenkomen
          var now = performance.now();
          stagger = now - lastTime < 120 ? stagger + 1 : 0;
          lastTime = now;
          entry.target.style.setProperty("--reveal-delay", Math.min(stagger * 80, 320) + "ms");
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ----- Video's: lazy laden + alleen afspelen in beeld ----- */
  var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
  var loadLazySources = function (video) {
    if (video.dataset.loaded) return;
    Array.prototype.forEach.call(video.querySelectorAll("source[data-src]"), function (s) {
      s.src = s.dataset.src;
    });
    video.dataset.loaded = "1";
    video.load();
  };
  var tryPlay = function (video) {
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay geweigerd: poster blijft staan */ });
  };

  if (reducedMotion) {
    // geen bewegend beeld: video's blijven op hun poster staan
    videos.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  } else if ("IntersectionObserver" in window) {
    var videoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (v.hasAttribute("data-lazy")) loadLazySources(v);
            v.muted = true;
            tryPlay(v);
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
    videos.forEach(function (v) { videoObserver.observe(v); });
  } else {
    videos.forEach(function (v) { loadLazySources(v); v.muted = true; tryPlay(v); });
  }
})();
