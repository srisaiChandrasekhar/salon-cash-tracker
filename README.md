# Salon Daily Cash Tracker

A single-page web app for a salon shop to track daily cash: each worker logs their
collections, cash they've used, and shop expenses (rent, supplies, utilities), and the
owner gets an instant end-of-day total plus history by day/week/month.

Everything is static — one `index.html` file, no backend, no database. Data is stored
in the browser's local storage on whichever device opens it (works great on a single
shared shop tablet; each new browser/device starts with its own empty data).

Supports multiple currencies (USD, INR, SAR, BDT, PKR) and languages (English, Hindi,
Arabic, Bengali, Urdu), switchable in Settings.

## Deploying to Azure (Static Web Apps — free tier, easiest option)

Azure Static Web Apps hosts static sites like this one for free, and sets up automatic
deployment from this GitHub repo for you — no server to manage.

1. Go to the [Azure Portal](https://portal.azure.com) and search for **Static Web Apps**.
2. Click **Create**.
3. Fill in the basics:
   - **Subscription / Resource group**: pick or create one.
   - **Name**: e.g. `salon-cash-tracker`.
   - **Plan type**: **Free**.
   - **Region**: closest to you.
4. Under **Deployment details**, choose **GitHub** and sign in / authorize if asked.
   - **Organization**: your GitHub username.
   - **Repository**: `salon-cash-tracker`.
   - **Branch**: `main`.
5. Under **Build Details**:
   - **Build Presets**: `Custom`.
   - **App location**: `/`
   - **Api location**: *(leave blank)*
   - **Output location**: *(leave blank)*
6. Click **Review + create**, then **Create**.

Azure will automatically commit a GitHub Actions workflow file into this repo and run
the first deployment. After a minute or two, your app will be live at a URL like:

```
https://salon-cash-tracker-<random>.azurestaticapps.net
```

You can find that URL on the Static Web App's **Overview** page in the Azure Portal.
Every future push to `main` will redeploy automatically.

### Custom domain (optional)

In the Static Web App resource, go to **Custom domains** → **Add**, and follow the
instructions to point your own domain at it via CNAME/TXT records.

## Running it locally

Just open `index.html` directly in a browser — no build step, no install needed.

## Notes

- All data lives in that browser's local storage. If the salon uses a shared tablet,
  always open the app from the same bookmark/home-screen shortcut on that same device.
- Use **Settings → Back up all data** periodically to copy a full backup to the
  clipboard as a safety net.
