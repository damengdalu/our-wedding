/* ============================================================================
   MAIN APP LOGIC
   ----------------------------------------------------------------------------
   Handles: language (detect/toggle/persist), theme (dark default + toggle),
   the password lock + decryption flow, page injection, i18n application,
   the countdown timer, the gallery + lightbox, navigation tabs, the mobile
   hamburger menu, and scroll-reveal animations.

   Load order (see index.html): CryptoJS → translations.js → encryption.js →
   content.js (ciphertext) → main.js
   ============================================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     STATE & CONSTANTS
     ---------------------------------------------------------------------- */
  var SS = window.sessionStorage;
  // Session keys. NOTE: we never store the password or the decryption key.
  // We DO cache the already-decrypted content for the session so a page
  // refresh doesn't require re-entering the password. sessionStorage is wiped
  // when the tab/browser closes — nothing persists to disk or across sessions.
  var KEY_CONTENT = "wedding_content";   // cached decrypted payload (this session)
  var KEY_LANG    = "wedding_lang";      // language preference (this session)
  var KEY_THEME   = "wedding_theme";     // theme preference (this session)

  // A short stamp identifying the deployed ciphertext. If content.js is
  // redeployed with new content, this changes, so a cached payload from a
  // previous version is ignored instead of shown stale.
  function contentVersion() {
    var c = window.ENCRYPTED_CONTENT || "";
    return c.length + ":" + c.slice(0, 24);
  }

  var state = {
    lang: "en",
    content: null,       // decrypted WEDDING_CONTENT
    activePage: "home",
    gallery: [],
    lightboxIndex: 0,
    countdownTimer: null
  };

  /* ----------------------------------------------------------------------
     SMALL HELPERS
     ---------------------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function t(key) {
    var dict = window.I18N[state.lang] || window.I18N.en;
    return (dict && dict[key] != null) ? dict[key] : (window.I18N.en[key] != null ? window.I18N.en[key] : key);
  }

  /* ----------------------------------------------------------------------
     i18n — apply translations to a DOM subtree
     ---------------------------------------------------------------------- */
  function applyI18n(root) {
    root = root || document;
    $all("[data-i18n]", root).forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $all("[data-i18n-html]", root).forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $all("[data-i18n-placeholder]", root).forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"))); });
    $all("[data-i18n-aria]", root).forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
  }

  /* ----------------------------------------------------------------------
     LANGUAGE
     ---------------------------------------------------------------------- */
  function detectLang() {
    var saved = SS.getItem(KEY_LANG);
    if (saved && window.LANGS.indexOf(saved) !== -1) return saved;
    var nav = (navigator.language || "en").toLowerCase();
    if (nav.indexOf("zh") === 0) return "zh";
    if (nav.indexOf("de") === 0) return "de";
    return "en";
  }

  function setLang(lang) {
    if (window.LANGS.indexOf(lang) === -1) lang = "en";
    state.lang = lang;
    SS.setItem(KEY_LANG, lang);
    document.documentElement.setAttribute("lang", lang);

    // Re-translate everything currently in the DOM (lock screen + site)
    applyI18n(document);

    // Reflect active state on every language switcher on the page
    $all(".lang-btn, .lock-lang button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });

    // Title + theme button label
    document.title = t("site.title");
    updateThemeButtonLabel();
  }

  function buildLangSwitch(container, withSeparators) {
    container.innerHTML = "";
    window.LANGS.forEach(function (lang, i) {
      if (withSeparators && i > 0) {
        var sep = document.createElement("span");
        sep.className = "lang-sep";
        sep.textContent = "·";
        container.appendChild(sep);
      }
      var b = document.createElement("button");
      b.className = "lang-btn";
      b.setAttribute("data-lang", lang);
      b.textContent = window.LANG_LABELS[lang];
      b.addEventListener("click", function () { setLang(lang); });
      container.appendChild(b);
    });
  }

  /* ----------------------------------------------------------------------
     THEME (dark is default)
     ---------------------------------------------------------------------- */
  function initTheme() {
    var saved = SS.getItem(KEY_THEME);
    var theme = saved === "light" ? "light" : "dark"; // dark default
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    SS.setItem(KEY_THEME, next);
    updateThemeButtonLabel();
  }

  function updateThemeButtonLabel() {
    var btn = $("#themeBtn");
    if (!btn) return;
    var isLight = document.documentElement.getAttribute("data-theme") === "light";
    // Glyph shows the mode you'll switch TO
    btn.textContent = isLight ? "☾" : "☀";
    btn.setAttribute("aria-label", isLight ? t("ctl.theme.toDark") : t("ctl.theme.toLight"));
    btn.setAttribute("title", btn.getAttribute("aria-label"));
  }

  /* ----------------------------------------------------------------------
     LOCK / UNLOCK
     ---------------------------------------------------------------------- */
  function initLock() {
    var form = $("#lockForm");
    var input = $("#lockInput");
    var errEl = $("#lockError");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = input.value.trim();
      if (!pw) return;

      var data = window.WeddingCrypto.decryptContent(pw);
      if (data) {
        // Success — cache for the session (with a version stamp) and reveal
        try { SS.setItem(KEY_CONTENT, JSON.stringify({ v: contentVersion(), data: data })); } catch (e2) { /* quota: fine, stays in memory */ }
        unlock(data);
      } else {
        // Gentle, styled failure: shake + soft message (no alert)
        input.classList.remove("error");
        void input.offsetWidth;       // restart the shake animation
        input.classList.add("error");
        errEl.classList.add("show");
        input.select();
      }
    });

    // Clear the error as soon as the guest edits the field again
    input.addEventListener("input", function () {
      input.classList.remove("error");
      errEl.classList.remove("show");
    });
  }

  function unlock(content) {
    state.content = content;

    // Merge encrypted content translations into the global I18N dictionary
    if (content.translations) {
      window.LANGS.forEach(function (lang) {
        if (!window.I18N[lang]) window.I18N[lang] = {};
        var src = content.translations[lang] || {};
        Object.keys(src).forEach(function (k) { window.I18N[lang][k] = src[k]; });
      });
    }

    // Inject every page's HTML
    var pages = content.pages || {};
    Object.keys(pages).forEach(function (id) {
      var el = $("#page-" + id);
      if (el) el.innerHTML = pages[id];
    });

    // Build dynamic pieces
    state.gallery = content.gallery || [];
    renderGallery();
    buildLightbox();
    setupReveal();
    initRsvp();

    // Translate the freshly-injected content
    applyI18n(document);

    // Show the requested first page + start the countdown
    activatePage(state.activePage);
    startCountdown(content.config && content.config.weddingDate);

    // Reveal the shell, hide the lock
    document.body.classList.remove("locked");
    $("#lock").classList.add("hidden");
    $("#site").classList.add("revealed");
  }

  /* ----------------------------------------------------------------------
     NAVIGATION (tabs + mobile hamburger)
     ---------------------------------------------------------------------- */
  function initNav() {
    $all(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        activatePage(tab.getAttribute("data-page"));
        // close mobile menu after choosing
        $(".tabs").classList.remove("open");
        $("#hamburger").classList.remove("open");
      });
    });

    $("#hamburger").addEventListener("click", function () {
      $(".tabs").classList.toggle("open");
      this.classList.toggle("open");
    });

    $("#brand").addEventListener("click", function () { activatePage("home"); });
  }

  function activatePage(id) {
    state.activePage = id;
    $all(".page").forEach(function (p) { p.classList.toggle("active", p.id === "page-" + id); });
    $all(".tab").forEach(function (tab) { tab.classList.toggle("active", tab.getAttribute("data-page") === id); });

    // Jump to top of content (NOT scrollIntoView)
    window.scrollTo({ top: 0, behavior: "auto" });

    // Make sure reveal elements in this page become visible
    ensureRevealVisible($("#page-" + id));
  }

  /* ----------------------------------------------------------------------
     COUNTDOWN
     ---------------------------------------------------------------------- */
  function startCountdown(iso) {
    var target = new Date(iso || "2026-10-18T16:00:00+08:00").getTime();
    if (state.countdownTimer) clearInterval(state.countdownTimer);

    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      setCd("days", d); setCd("hours", h); setCd("mins", m); setCd("secs", s);
    }
    function setCd(name, val) {
      var el = $('[data-cd="' + name + '"]');
      if (el) el.textContent = (val < 10 ? "0" : "") + val;
    }
    tick();
    state.countdownTimer = setInterval(tick, 1000);
  }

  /* ----------------------------------------------------------------------
     GALLERY + LIGHTBOX
     ---------------------------------------------------------------------- */
  function renderGallery() {
    var grid = $("#gallery-grid");
    if (!grid) return;
    grid.innerHTML = "";

    state.gallery.forEach(function (item, i) {
      var fig = document.createElement("figure");
      fig.className = "skeleton";

      var img = document.createElement("img");
      img.alt = t(item.caption) || "";
      img.loading = "lazy";
      img.addEventListener("load", function () {
        img.classList.add("loaded");
        fig.classList.add("done");
      });
      img.addEventListener("error", function () { fig.classList.add("done"); });
      img.src = item.src;

      var cap = document.createElement("figcaption");
      cap.setAttribute("data-i18n", item.caption);
      cap.textContent = t(item.caption);

      fig.appendChild(img);
      fig.appendChild(cap);
      fig.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(fig);
    });
  }

  function buildLightbox() {
    if ($("#lightbox")) return; // build once
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.id = "lightbox";
    lb.innerHTML =
      '<span class="lb-count" id="lbCount"></span>' +
      '<button class="lb-btn lb-close" id="lbClose" aria-label="Close">✕</button>' +
      '<button class="lb-btn lb-prev" id="lbPrev" aria-label="Previous">‹</button>' +
      '<img class="lightbox-img" id="lbImg" alt="">' +
      '<button class="lb-btn lb-next" id="lbNext" aria-label="Next">›</button>' +
      '<div class="lightbox-cap" id="lbCap"></div>';
    document.body.appendChild(lb);

    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbPrev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    $("#lbNext").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });

    // Keyboard navigation
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });

    // Touch swipe navigation
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  function openLightbox(i) {
    state.lightboxIndex = i;
    $("#lightbox").classList.add("open");
    document.body.classList.add("locked");
    showLightboxImage();
  }
  function closeLightbox() {
    $("#lightbox").classList.remove("open");
    document.body.classList.remove("locked");
  }
  function step(dir) {
    var n = state.gallery.length;
    state.lightboxIndex = (state.lightboxIndex + dir + n) % n;
    showLightboxImage();
  }
  function showLightboxImage() {
    var item = state.gallery[state.lightboxIndex];
    var img = $("#lbImg");
    // Smooth fade: hide, swap src, fade back in on load
    img.classList.remove("show");
    var pre = new Image();
    pre.onload = function () { img.src = item.src; img.classList.add("show"); };
    pre.src = item.src;
    img.alt = t(item.caption) || "";
    $("#lbCap").textContent = t(item.caption) || "";
    $("#lbCount").textContent = (state.lightboxIndex + 1) + " / " + state.gallery.length;
  }

  /* ----------------------------------------------------------------------
     RSVP FORM  (custom form → FormSubmit.co → email to the couple)
     ---------------------------------------------------------------------- */
  function initRsvp() {
    var form = $("#rsvpForm");
    if (!form) return;

    var endpoint = state.content && state.content.config && state.content.config.rsvpEndpoint;
    var msg = $("#rsvpMsg");
    var btn = $("#rsvpSubmit");

    // Show/hide the plus-one name field based on the plus-one choice
    $all('input[name="plus_one"]', form).forEach(function (r) {
      r.addEventListener("change", function () {
        var yes = form.querySelector('input[name="plus_one"]:checked');
        $("#rsvp-plusname-field").hidden = !(yes && yes.value === "Yes");
      });
    });

    // Clear inline error styling as the guest edits
    ["rsvp-name", "rsvp-email"].forEach(function (id) {
      var el = $("#" + id);
      el.addEventListener("input", function () { el.classList.remove("invalid"); msg.textContent = ""; });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "rsvp-msg";
      msg.textContent = "";

      // Honeypot — if a bot filled the hidden field, silently stop
      if ($("#rsvp-honey").value) return;

      var name = $("#rsvp-name").value.trim();
      var email = $("#rsvp-email").value.trim();
      var attending = form.querySelector('input[name="attending"]:checked');
      var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

      // Validate the three required fields
      $("#rsvp-name").classList.toggle("invalid", !name);
      $("#rsvp-email").classList.toggle("invalid", !emailOk);
      form.querySelectorAll(".seg")[0].classList.toggle("invalid", !attending);
      if (!name || !emailOk || !attending) {
        msg.textContent = t("rsvp.f.error_validate");
        msg.classList.add("err");
        return;
      }

      var plus = form.querySelector('input[name="plus_one"]:checked');
      var payload = {
        name: name,
        email: email,
        attending: attending.value,
        plus_one: plus ? plus.value : "No",
        plus_one_name: $("#rsvp-plusname").value.trim(),
        dietary: $("#rsvp-diet").value.trim(),
        note: $("#rsvp-note").value.trim(),
        // FormSubmit.co options:
        _subject: "New RSVP — [Name] & [Name] Wedding",
        _template: "table",
        _captcha: "false"
      };

      if (!endpoint) { msg.textContent = t("rsvp.f.error"); msg.classList.add("err"); return; }

      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = t("rsvp.f.sending");

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (res) {
          if (res && (res.success === "true" || res.success === true)) {
            form.hidden = true;
            $("#rsvpSuccess").hidden = false;
            window.scrollTo({ top: 0, behavior: "auto" });
          } else {
            throw new Error("submit failed");
          }
        })
        .catch(function () {
          msg.textContent = t("rsvp.f.error");
          msg.classList.add("err");
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  }

  /* ----------------------------------------------------------------------
     SCROLL REVEAL
     ---------------------------------------------------------------------- */
  var revealObserver = null;
  function setupReveal() {
    if (!("IntersectionObserver" in window)) {
      $all(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    $all(".reveal").forEach(function (el) { revealObserver.observe(el); });
  }

  // When a hidden page becomes active, reveal anything already in view
  function ensureRevealVisible(page) {
    if (!page) return;
    $all(".reveal", page).forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 80) {
        el.style.transitionDelay = Math.min(i * 60, 360) + "ms";
        el.classList.add("in");
        if (revealObserver) revealObserver.unobserve(el);
      }
    });
  }

  /* ----------------------------------------------------------------------
     BOOT
     ---------------------------------------------------------------------- */
  function boot() {
    initTheme();
    state.lang = detectLang();

    // Wire header controls
    buildLangSwitch($("#langSwitch"), true);
    buildLangSwitch($("#lockLang"), false);
    $("#themeBtn").addEventListener("click", toggleTheme);
    initNav();
    initLock();

    // First paint of all chrome text in the chosen language
    setLang(state.lang);

    // If we already unlocked earlier this session, skip the password screen —
    // but only if the cache matches the currently-deployed content version.
    var cached = SS.getItem(KEY_CONTENT);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.v === contentVersion() && parsed.data && parsed.data.__ok) {
          unlock(parsed.data);
          return;
        }
      } catch (e) { /* fall through to lock screen */ }
    }

    // Otherwise show the lock and focus the input
    document.body.classList.add("locked");
    var input = $("#lockInput");
    if (input) input.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
