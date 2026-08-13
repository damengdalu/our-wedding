#!/usr/bin/env node
/* ============================================================================
   tools/encrypt.js  —  CLI encryptor (Node, no browser, no dependencies)
   ----------------------------------------------------------------------------
   Reads /content/content.template.js, encrypts it with AES-256-CBC in the
   CryptoJS / OpenSSL "Salted__" format (MD5 key derivation), and writes the
   ciphertext to /js/content.js — the exact format js/encryption.js decrypts.

   Usage:
     node tools/encrypt.js [password]
     PASSWORD=secret node tools/encrypt.js
   Defaults to the password "shuangxi" if none is given.

   This is the command the Makefile calls.
   ============================================================================ */

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'content', 'content.template.js');
const OUTPUT = path.join(ROOT, 'js', 'content.js');

const password = process.argv[2] || process.env.PASSWORD || 'shuangxi';

// --- OpenSSL EVP_BytesToKey (MD5) — same KDF CryptoJS uses ---
function evpKDF(pass, salt, keyLen, ivLen) {
  let derived = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  const passBuf = Buffer.from(pass, 'utf8');
  while (derived.length < keyLen + ivLen) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, passBuf, salt])).digest();
    derived = Buffer.concat([derived, prev]);
  }
  return { key: derived.slice(0, keyLen), iv: derived.slice(keyLen, keyLen + ivLen) };
}

// --- Load window.WEDDING_CONTENT from the template ---
function loadContent() {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const sandboxWindow = {};
  // The template is plain JS that assigns to `window`. Run it with our stub.
  // eslint-disable-next-line no-new-func
  new Function('window', src)(sandboxWindow);
  if (!sandboxWindow.WEDDING_CONTENT) {
    throw new Error('WEDDING_CONTENT not found in ' + TEMPLATE);
  }
  return sandboxWindow.WEDDING_CONTENT;
}

function main() {
  const content = loadContent();
  const payload = Object.assign({ __ok: true }, content);
  const json = JSON.stringify(payload);

  const salt = crypto.randomBytes(8);
  const { key, iv } = evpKDF(password, salt, 32, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const ct = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const blob = Buffer.concat([Buffer.from('Salted__', 'utf8'), salt, ct]);
  const b64 = blob.toString('base64');

  const fileText =
    '/* ============================================================================\n' +
    '   ENCRYPTED CONTENT  —  GENERATED FILE (do not edit by hand)\n' +
    '   ----------------------------------------------------------------------------\n' +
    '   AES-256-CBC ciphertext (CryptoJS / OpenSSL "Salted__" format) of the payload\n' +
    '   in /content/content.template.js. Decrypted by the site after the correct\n' +
    '   password is entered (see js/encryption.js + js/main.js).\n' +
    '\n' +
    '   Regenerate:  make encrypt   (or: node tools/encrypt.js <password>)\n' +
    '   Generated:   ' + new Date().toISOString() + '\n' +
    '   ============================================================================ */\n' +
    '\n' +
    'window.ENCRYPTED_CONTENT = ' + JSON.stringify(b64) + ';\n';

  fs.writeFileSync(OUTPUT, fileText, 'utf8');
  console.log('✓ Encrypted ' + json.length + ' bytes → js/content.js (' + b64.length + ' b64 chars)');
  console.log('  password: "' + password + '"');
}

try {
  main();
} catch (e) {
  console.error('✗ Encryption failed:', e.message);
  process.exit(1);
}
