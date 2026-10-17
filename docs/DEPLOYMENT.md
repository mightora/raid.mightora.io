# Deployment and DNS

Live domain: https://raid.mightora.io/

GitHub repository: https://github.com/mightora/raid.mightora.io

GitHub Actions Pages deployment uses `dist/`, generated from source by `python scripts/build.py`. GitHub Pages must be set to **GitHub Actions** in repository Settings → Pages, not a branch-based build. Add `raid.mightora.io` in the **Custom domain** setting and turn on **Enforce HTTPS** after the certificate is issued. The committed CNAME is retained in `dist/`.

Cloudflare DNS: CNAME `raid` → `mightora.github.io`, DNS-only to avoid GitHub Pages custom-domain verification/certificate conflicts.

Never claim production is live until a successful Pages action and a request to https://raid.mightora.io confirm it.