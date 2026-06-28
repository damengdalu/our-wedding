/* ============================================================================
   TRANSLATIONS — UI CHROME ONLY  (en / de / zh)
   ----------------------------------------------------------------------------
   This file holds ONLY the non-sensitive "chrome": the password screen, the
   navigation labels, and small UI strings. It is loaded in PLAINTEXT on every
   visit so the lock screen can be shown before unlocking.

   The actual page CONTENT (names, date, travel/hotel/guide copy, gallery
   captions) lives ENCRYPTED in /js/content.js and is merged into this same
   I18N object only AFTER the correct password is entered. See content.template.js.

   To add/adjust a language, edit the three blocks below. Keep keys identical
   across en/de/zh. Chinese = Simplified (zh).
   ============================================================================ */

window.I18N = {
  en: {
    /* --- meta --- */
    "site.title": "Our Wedding",
    "brand": "[Name] & [Name]",

    /* --- lock / password screen --- */
    "lock.title": "Our Wedding",
    "lock.subtitle": "A private celebration",
    "lock.placeholder": "Enter password",
    "lock.submit": "Enter",
    "lock.hint": "Please enter the password provided with your invitation.",
    "lock.error": "That doesn’t look right. Please check your invitation and try again.",

    /* --- navigation tabs --- */
    "nav.home": "Welcome",
    "nav.travel": "Getting There",
    "nav.hotel": "Hotels",
    "nav.guide": "Travel Guide",
    "nav.gallery": "Gallery",
    "nav.rsvp": "RSVP",

    /* --- controls --- */
    "ctl.theme.toLight": "Switch to light mode",
    "ctl.theme.toDark": "Switch to dark mode",
    "ctl.lang": "Language",

    /* --- footer --- */
    "footer.text": "We can’t wait to celebrate with you.",
    "footer.madewith": "Made with love"
  },

  de: {
    "site.title": "Unsere Hochzeit",
    "brand": "[Name] & [Name]",

    "lock.title": "Unsere Hochzeit",
    "lock.subtitle": "Eine private Feier",
    "lock.placeholder": "Passwort eingeben",
    "lock.submit": "Eintreten",
    "lock.hint": "Bitte gib das Passwort ein, das deiner Einladung beilag.",
    "lock.error": "Das scheint nicht zu stimmen. Bitte prüfe deine Einladung und versuche es erneut.",

    "nav.home": "Willkommen",
    "nav.travel": "Anreise",
    "nav.hotel": "Hotels",
    "nav.guide": "Reiseführer",
    "nav.gallery": "Galerie",
    "nav.rsvp": "Zusage",

    "ctl.theme.toLight": "Zum hellen Modus wechseln",
    "ctl.theme.toDark": "Zum dunklen Modus wechseln",
    "ctl.lang": "Sprache",

    "footer.text": "Wir freuen uns darauf, mit euch zu feiern.",
    "footer.madewith": "Mit Liebe gemacht"
  },

  zh: {
    "site.title": "我们的婚礼",
    "brand": "[Name] & [Name]",

    "lock.title": "我们的婚礼",
    "lock.subtitle": "一场私密的庆典",
    "lock.placeholder": "请输入密码",
    "lock.submit": "进入",
    "lock.hint": "请输入随请柬一同附上的密码。",
    "lock.error": "密码似乎不正确，请核对请柬后再试一次。",

    "nav.home": "欢迎",
    "nav.travel": "如何抵达",
    "nav.hotel": "酒店住宿",
    "nav.guide": "旅行指南",
    "nav.gallery": "照片画廊",
    "nav.rsvp": "回复出席",

    "ctl.theme.toLight": "切换至浅色模式",
    "ctl.theme.toDark": "切换至深色模式",
    "ctl.lang": "语言",

    "footer.text": "期待与你共同庆祝这一天。",
    "footer.madewith": "用心制作"
  }
};

/* Supported languages, in display order */
window.LANGS = ["en", "de", "zh"];

/* Short labels shown in the language switcher */
window.LANG_LABELS = { en: "EN", de: "DE", zh: "中文" };
