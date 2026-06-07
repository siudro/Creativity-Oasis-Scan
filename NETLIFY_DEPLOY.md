# Deploying To Netlify

Use these settings on the Netlify build settings form when the repository root contains `index.html`, `winner.html`, `not-winner.html`, and `netlify.toml`.

| Field | Value |
| --- | --- |
| Branch to deploy | `main` |
| Base directory | leave empty |
| Build command | leave empty |
| Publish directory | `.` |
| Functions directory | `netlify/functions` |

If your files are inside a subfolder in the repo, set **Base directory** to that folder path and keep **Publish directory** as `.`.

## After Deployment

Netlify will give you a URL like:

```text
https://creativity-oasis-scan.netlify.app
```

Your non-winner QR should point to:

```text
https://creativity-oasis-scan.netlify.app/not-winner.html
```

Each winner QR should point to one of the private token links:

```text
https://creativity-oasis-scan.netlify.app/winner.html?token=TOKEN_HERE
```

Replace `https://YOUR-DOMAIN.example` in your private `winning-qr-links.csv` with your Netlify URL.

## How Claims Work On Netlify

The Netlify deployment uses:

- Static pages for the QR screens.
- `netlify/functions/claim.js` for `/api/claim`.
- Netlify Blobs to remember claimed winning tokens.

The first visit to a valid winning token accepts the claim. The same browser can refresh and still see the win. A different browser/device using that same token should see `already_claimed`.

Keep `winning-qr-links.csv` private. Do not publish it in a public repository.
