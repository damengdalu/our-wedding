/* ============================================================================
   ENCRYPTION / DECRYPTION LAYER
   ----------------------------------------------------------------------------
   The protected content (all inner pages + their translations) is stored as an
   AES-encrypted ciphertext string in /js/content.js (variable
   `window.ENCRYPTED_CONTENT`). Nothing of the real content reaches the visitor
   until they type the correct password.

   We use CryptoJS (loaded from CDN in index.html) in its simplest, most
   robust mode:  CryptoJS.AES.encrypt(plaintext, passphrase).toString()
   This produces an OpenSSL-compatible "U2FsdGVk..." string that bundles a
   random salt; CryptoJS derives the key + IV from passphrase + salt for you.

   SECURITY NOTE (read me):
   Client-side password protection keeps content private from casual visitors
   and search engines — it is NOT bank-grade security, because the ciphertext
   ships to the browser. That is the right and intended trade-off for a private
   wedding site. Choose a non-trivial password and share it only with guests.
   ============================================================================ */

(function () {
  "use strict";

  /**
   * Try to decrypt the bundled ciphertext with a candidate password.
   * @param {string} password
   * @returns {object|null}  The parsed content object, or null on failure.
   */
  function decryptContent(password) {
    if (typeof CryptoJS === "undefined") {
      console.error("CryptoJS is not loaded. Check the CDN <script> in index.html.");
      return null;
    }
    if (typeof window.ENCRYPTED_CONTENT !== "string" || !window.ENCRYPTED_CONTENT) {
      console.error("ENCRYPTED_CONTENT missing. Did /js/content.js load? Did you run the build tool?");
      return null;
    }

    try {
      var bytes = CryptoJS.AES.decrypt(window.ENCRYPTED_CONTENT, password);
      var text = bytes.toString(CryptoJS.enc.Utf8);

      // A wrong password yields empty string or garbage that won't JSON-parse.
      if (!text) return null;

      var data = JSON.parse(text);

      // Sanity check: the payload must carry the marker we set when encrypting.
      if (!data || data.__ok !== true) return null;

      return data;
    } catch (e) {
      // Wrong password almost always lands here (bad UTF-8 / invalid JSON).
      return null;
    }
  }

  /**
   * Decrypt a base64 OpenSSL-format ("Salted__...") AES ciphertext into raw
   * bytes. Used for encrypted photo files (see /tools/encrypt.js and the
   * gallery loader in main.js) — same scheme as decryptContent, but returns
   * binary instead of parsing as UTF-8 JSON.
   * @param {string} base64Ciphertext
   * @param {string} password
   * @returns {Uint8Array|null}
   */
  function decryptBinary(base64Ciphertext, password) {
    if (typeof CryptoJS === "undefined") return null;
    try {
      var decrypted = CryptoJS.AES.decrypt(base64Ciphertext, password);
      if (!decrypted || decrypted.sigBytes <= 0) return null;
      var words = decrypted.words;
      var sigBytes = decrypted.sigBytes;
      var u8 = new Uint8Array(sigBytes);
      for (var i = 0; i < sigBytes; i++) {
        u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      }
      return u8;
    } catch (e) {
      return null;
    }
  }

  window.WeddingCrypto = {
    decryptContent: decryptContent,
    decryptBinary: decryptBinary
  };
})();
