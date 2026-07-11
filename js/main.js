/* JS Detail Studio — main.js */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- Taalwissel NL / EN (client-side, geen extern script) ----- */
  var applyLang = function (l) {
    document.documentElement.setAttribute("lang", l);
    document.querySelectorAll("[data-en]").forEach(function (el) {
      if (!el.hasAttribute("data-nl")) el.setAttribute("data-nl", el.innerHTML);
      el.innerHTML = l === "en" ? el.getAttribute("data-en") : el.getAttribute("data-nl");
    });
    // ook vertaalbare attributen (placeholder/aria/alt) via data-en-<attr>
    document.querySelectorAll("[data-en-attr]").forEach(function (el) {
      var pairs = el.getAttribute("data-en-attr").split("|");
      pairs.forEach(function (p) {
        var i = p.indexOf(":");
        if (i < 0) return;
        var attr = p.slice(0, i), en = p.slice(i + 1);
        var nlKey = "data-nl-" + attr;
        if (!el.hasAttribute(nlKey)) el.setAttribute(nlKey, el.getAttribute(attr) || "");
        el.setAttribute(attr, l === "en" ? en : el.getAttribute(nlKey));
      });
    });
    document.querySelectorAll(".lang-toggle").forEach(function (b) {
      b.textContent = l === "nl" ? "EN" : "NL";
      b.setAttribute("aria-label", l === "nl" ? "Switch to English" : "Schakel naar Nederlands");
    });
    try { localStorage.setItem("jsds-lang", l); } catch (e) {}
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".lang-toggle") : null;
    if (!b) return;
    e.preventDefault();
    applyLang(document.documentElement.getAttribute("lang") === "en" ? "nl" : "en");
  });
  var savedLang;
  try { savedLang = localStorage.getItem("jsds-lang"); } catch (e) {}
  if (savedLang === "en") applyLang("en");

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

  /* ----- Ankerlinks op de snap-homepage -----
     Mandatory scroll-snap annuleert soepele ankerscrolls in Chrome/Safari;
     daarom: snap tijdelijk uit, scrollen, en na afloop weer aan. */
  var snapRoot = document.documentElement;
  var usesSnap = snapRoot.classList.contains("snap");
  var snapScrollTo = function (el) {
    // met mandatory snap actief werkt alleen een instant jump betrouwbaar
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : usesSnap ? "instant" : "smooth" });
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, "", a.getAttribute("href"));
    snapScrollTo(target);
  });
  var jumpToHash = function () {
    var t = location.hash && document.getElementById(location.hash.slice(1));
    if (t) snapScrollTo(t);
  };
  if (usesSnap && location.hash) {
    jumpToHash();
    // Chrome herstelt de scrollpositie nogmaals ná load; daarna opnieuw springen
    window.addEventListener("load", function () {
      requestAnimationFrame(jumpToHash);
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
  var fallbackToPoster = function (video) {
    // Autoplay geweigerd (bv. energiebesparings-/databesparingsmodus op mobiel):
    // verberg de video zodat er geen native play-knop verschijnt, en toon het
    // poster-frame als stilstaande achtergrond op het omliggende paneel.
    var poster = video.getAttribute("poster");
    var host = video.closest(".hero, .band, .chapter") || video.parentElement;
    if (poster && host) {
      host.style.backgroundImage = "url('" + poster + "')";
      host.style.backgroundSize = "cover";
      host.style.backgroundPosition = "center";
    }
    video.style.opacity = "0";
  };
  var tryPlay = function (video) {
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () { fallbackToPoster(video); });
    }
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
