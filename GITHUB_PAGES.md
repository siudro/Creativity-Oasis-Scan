# Deploying To GitHub Pages

GitHub Pages can host the static files: `index.html`, `winner.html`, `not-winner.html`, `logo.png`, and `config.js`.

GitHub Pages cannot run the secure `/api/claim` endpoint. For production, keep the tiny API in `secure-claim-worker.js` on Cloudflare Workers, then point `config.js` to that Worker URL.

## Step 1: Create The GitHub Repo

1. Go to GitHub and create a new repository.
2. Use a private repository if you want to keep every project file together.
3. If the repository is public, do not commit `winning-qr-links.csv` or `local-test-links.csv`. They contain the real winning URLs.

## Step 2: Commit The Static Site

From this folder, run:

```bash
git init
git add .
git commit -m "Add Creativity Oasis QR pages"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

The `.gitignore` already excludes local claim state and private token-link CSVs.

## Step 3: Turn On GitHub Pages

1. Open the repository on GitHub.
2. Go to Settings.
3. Go to Pages.
4. Under Build and deployment, choose Source: Deploy from a branch.
5. Choose Branch: `main`.
6. Choose Folder: `/ (root)`.
7. Click Save.

GitHub will publish the site at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

Your public non-winner QR can point to:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/not-winner.html
```

## Step 4: Connect The Secure Claim API

Deploy `secure-claim-worker.js` to Cloudflare Workers, create a D1 database, and run:

1. `schema.sql`
2. `seed-winning-tokens.sql`

Set the Worker environment variable:

```text
ALLOWED_ORIGIN=https://YOUR-USERNAME.github.io
```

Then edit `config.js`:

```js
window.CREATIVITY_OASIS_CONFIG = {
  CLAIM_ENDPOINT: "https://YOUR-WORKER-DOMAIN.example/api/claim"
};
```

Commit and push that change.

## Step 5: Generate QR Codes

Replace the domain in your private `winning-qr-links.csv` with the final GitHub Pages URL.

Use:

- One public QR for `not-winner.html`.
- Ten private winner QR links from `winning-qr-links.csv`.

Keep `winning-qr-links.csv` private. If those URLs are published in a public repo, anyone can scan the winning links.
