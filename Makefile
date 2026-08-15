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
#    make get-rsvp        → dump submitted RSVPs from the Cloudflare D1 database
#    make clean-entire-d1 → delete ALL rows from the D1 RSVP database (asks to confirm)
#    make help            → list targets
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
.PHONY: all encrypt build serve rebuild clean get-rsvp clean-entire-d1 help

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

get-rsvp:
	@cd tools/rsvp-worker && wrangler d1 execute wedding-rsvp --remote --command "SELECT * FROM rsvps ORDER BY created_at;"

clean-entire-d1:
	@echo "⚠️  This permanently deletes ALL rows from the RSVP database (wedding-rsvp)."
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || (echo "Aborted."; exit 1)
	@cd tools/rsvp-worker && wrangler d1 execute wedding-rsvp --remote --command "DELETE FROM rsvps;"
	@echo "✓ RSVP database cleared"

help:
	@echo "Targets: all (default) | encrypt | build | serve | rebuild | clean | get-rsvp | clean-entire-d1"
	@echo "Vars:    PASSWORD=$(PASSWORD)  PORT=$(PORT)"
	@echo "Usage:   make                # encrypt then serve"
	@echo "         make encrypt PASSWORD=ourbigday"
	@echo "         make serve PORT=9000"
	@echo "         make get-rsvp       # list all RSVP submissions"
	@echo "         make clean-entire-d1 # wipe all RSVP submissions (with confirmation)"
