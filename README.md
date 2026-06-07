# Creativity Oasis QR Pages

This package is deployment-ready and intentionally small:

- `index.html` redirects the site root to the non-winning page.
- `not-winner.html` is the public non-winning QR page.
- `winner.html` is the winning QR page.
- `logo.png` is the original Creativity Oasis logo.
- `config.js` controls where the winner page sends claim checks.
- `secure-claim-worker.js` is the tiny production API that prevents abuse.
- `local-test-server.js` lets you test the token flow before deployment.

The requested font names are set in CSS: `Omnes Arabic` for Arabic and `Ara Hamah City` for English. If those licensed fonts are not installed or hosted by the browser environment, the pages fall back to system fonts.

## How The Tokens Work

Each winning QR URL contains a long random token:

```text
winner.html?token=RANDOM_SECRET_TOKEN
```

The server hashes that token with SHA-256 and checks it against the approved list in `seed-winning-tokens.sql`. Only approved hashes can win. On first successful scan, the server stores a claim for that token hash. Refreshing from the same browser still works because a claim cookie is set, but scanning the same QR from a different browser/device returns `already_claimed`.

This is why the winner page cannot be only static HTML in production. If the page alone decided who wins, anyone could copy the URL or edit the page script.

## Test Before Deployment

No installs are required if Node.js is available.

1. Open a terminal in this folder.
2. Run:

```bash
node local-test-server.js
```

3. Open URLs from `local-test-links.csv`.
4. Try the same winner link twice in the same browser: it should still show the win.
5. Try the same winner link in a different browser or after clearing cookies: it should show already claimed.

To reset local claims during testing, open:

```text
http://127.0.0.1:8787/api/reset-local-claims
```

or delete `local-claims.json`.

For visual preview only, open:

```text
http://127.0.0.1:8787/winner.html?preview=1
```

Do not use `preview=1` in real QR links.

## Production Deployment

For GitHub Pages, follow `GITHUB_PAGES.md`.

The simplest secure production shape is:

1. Upload `index.html`, `winner.html`, `not-winner.html`, `logo.png`, and `config.js` to the static site.
2. Deploy `secure-claim-worker.js` with route `/api/claim`.
3. Create a D1 database and bind it to the Worker as `DB`.
4. Run `schema.sql`, then `seed-winning-tokens.sql` against that D1 database.
5. If the API is not on the same domain, edit `config.js` so `CLAIM_ENDPOINT` is the full Worker URL.
6. Replace `https://YOUR-DOMAIN.example` in `winning-qr-links.csv` with your final domain.
7. Generate one public QR for `not-winner.html` and ten private winner QRs from the CSV.

Keep these files private:

- `winning-qr-links.csv`
- `local-test-links.csv`

The public static files can be visible. The secure part is the random token plus the server-side claim check.
