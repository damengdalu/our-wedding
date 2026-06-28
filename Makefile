# ============================================================================
#  Wedding website — build & serve
#  ----------------------------------------------------------------------------
#  Targets:
#    make            → encrypt + serve (the usual one-liner)
#    make encrypt    → re-encrypt content/content.template.js → js/content.js
#    make serve      → run a local web server (re-renders the live site)
#    make build      → alias for `encrypt`
#    make clean      → delete the generated js/content.js
#    make rebuild    → clean + encrypt
#    make help       → list targets
#
#  Variables (override on the command line):
#    PASSWORD   the guest password to encrypt with   (default: shuangxi)
#    PORT       local server port                     (default: 8000)
#
#  Examples:
#    make PASSWORD=ourbigday
#    make encrypt PASSWORD=ourbigday
#    make serve PORT=9000
#
#  NOTE ON "clearing the cache": there is no server-side cache to clear. The site
#  caches decrypted content in the browser's sessionStorage (per tab) only. Each
#  `make encrypt` writes a fresh ciphertext, and the app stamps the cache with a
#  content version — so when content.js changes, any previously-cached copy is
#  automatically ignored on next load. Re-encrypting IS the cache bust.
#  (sessionStorage also clears whenever the guest closes the tab.)
# ============================================================================

PASSWORD ?= shuangxi
PORT     ?= 8000

.DEFAULT_GOAL := all
.PHONY: all encrypt build serve rebuild clean help

all: encrypt serve

encrypt:
	@node tools/encrypt.js "$(PASSWORD)"

build: encrypt

serve:
	@echo "→ Serving http://localhost:$(PORT)/   (password: $(PASSWORD))"
	@echo "  Press Ctrl+C to stop."
	@python3 -m http.server $(PORT)

rebuild: clean encrypt

clean:
	@rm -f js/content.js && echo "✓ Removed js/content.js"

help:
	@echo "Targets: all (default) | encrypt | build | serve | rebuild | clean"
	@echo "Vars:    PASSWORD=$(PASSWORD)  PORT=$(PORT)"
	@echo "Usage:   make                # encrypt then serve"
	@echo "         make encrypt PASSWORD=ourbigday"
	@echo "         make serve PORT=9000"
