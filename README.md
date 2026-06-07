# Creativity Oasis QR Pages

This is now a simple static QR project. There are no tokens, APIs, functions, databases, or build steps.

## Files

- `index.html` redirects the site root to the non-winner page.
- `not-winner.html` is the public non-winning QR page.
- `winner.html` is the winning QR page.
- `logo.png` is the Creativity Oasis logo.
- `qr-links.csv` has the two URL shapes to use after deployment.
- `netlify.toml` is optional, but helps Netlify publish the current folder as a static site.

## Claim Flow

The winner page always shows:

```text
Claim code: WC26
```

Ask visitors to show the page and say/send the code. Track redemptions manually in WhatsApp or at the space. Once 10 people redeem `WC26`, stop accepting the code.

This is intentionally simple. It does not prevent someone from sharing the winner link, but it avoids broken deployment and makes redemption staff-controlled.

## Deploy On Netlify

Use these settings:

```text
Branch to deploy: main
Base directory: leave empty
Build command: leave empty
Publish directory: .
Functions directory: leave empty
Environment variables: none
```

If the files are inside a subfolder in your repo, set **Base directory** to that folder and keep **Publish directory** as `.`.

## Deploy On GitHub Pages

1. Push the files to GitHub.
2. Go to repository Settings.
3. Go to Pages.
4. Source: Deploy from a branch.
5. Branch: `main`.
6. Folder: `/ (root)`.

## QR Links

After deployment, replace `https://YOUR-SITE.example` in `qr-links.csv`.

Use:

```text
Non-winner QR:
https://YOUR-SITE.example/not-winner.html

Winner QR:
https://YOUR-SITE.example/winner.html
```

You only need two QR codes now: one winner and one non-winner.
