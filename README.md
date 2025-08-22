# Competitor Tracker Project

**Overview:**
This project is an automation system that uses **Playwright** to scrape competitor websites, collects data like product titles, prices, and availability, and integrates with **n8n** to automate workflows. You can run it **locally** or host it on **Replit**. Scraped data can be stored in **Google Sheets** or sent via notifications.

---

## 1) Running Locally

1. Open a terminal inside the project folder.
2. Install dependencies:

```bash
npm install
npx playwright install --with-deps
```

3. Copy the environment template:

```bash
cp .env.example .env
```

4. Run the scraper locally:

```bash
npm run scrape
```

* **Note:** `src/run_local.js` reads the targets from `config/sites.json` and outputs the results in `sample_output/output.json`.
* Screenshots are saved in `sample_output/` if enabled in the options.

---

## 2) Running on Replit

1. Create a **Node.js Repl** and import this project.
2. Add **Secrets** in Replit for configuration:

   * `JOB_SECRET` → Secret key for authentication from n8n.
   * `HEADLESS` → `true` or `false` (controls headless browser mode).
   * `BLOCK_MEDIA` → `true` to block images/fonts for faster scraping.
3. Install dependencies and Playwright browser:

```bash
npm install
npx playwright install --with-deps
```

4. Start the server:

```bash
npm start
```

5. Available endpoints:

   * `GET /healthz` → `{ "ok": true }` to check server health.
   * `POST /run` → Trigger scraping remotely.

* **Optional:** Enable **Deployments** on Replit for “Always On” execution.

---

## 3) API Endpoints

### `GET /healthz`

* Returns a JSON object:

```json
{ "ok": true }
```

### `POST /run`

* Starts scraping for the defined targets.
* JSON body example:

```json
{
  "targets": [
    {
      "url": "https://example.com/product/1",
      "selectors": {
        "title": "h1",
        "price": ".price",
        "availability": ".stock"
      },
      "device": "desktop"
    }
  ],
  "options": { "screenshots": true }
}
```

* **Authentication:**
  Include header `x-job-secret` with the value from `.env`:

```
x-job-secret: <JOB_SECRET>
```

* **Behavior:**

  * If `targets` is not provided in the request, the server reads `config/sites.json`.
  * Returns JSON with `results` (scraped data) and `errors` (if any).

---

## 4) n8n Integration

* Workflow example:

  1. **Cron Trigger** → Runs daily or at a defined schedule.
  2. **Set Node** → Define the list of targets (optional).
  3. **HTTP Request Node** → Sends POST request to `/run` endpoint on Replit.
  4. **Google Sheets Node** → Append the scraped data to a sheet.
  5. **Notifications (Optional)** → Slack, email, or any integration supported by n8n.

* **Tip:** Create a unique key for each row (e.g., `url + date`) to prevent duplicates.

---

## 5) Project Structure

```
competitor-tracker/
  src/
    index.js          # Express server with /run endpoint
    scrape.js         # Playwright scraper functions
    run_local.js      # Run scraper locally from config/sites.json
  utils/
    helpers.js        # Utility functions: slugify, chunk, timestamp
  config/
    sites.json        # Target competitor sites and CSS selectors
  sample_output/
    output.json       # Output JSON generated after scraping
  .env.example        # Environment variables template
  package.json        # Node dependencies and scripts
  README.md           # Project documentation
```

---

## 6) Configuring Targets (`config/sites.json`)

* Each target must include:

```json
{
  "name": "Shop Name",
  "url": "https://example.com/product",
  "device": "desktop",
  "selectors": {
    "title": "h1",
    "price": ".price",
    "availability": ".stock"
  }
}
```

* **url** → Web page to scrape.
* **device** → `desktop` or `mobile` (emulation).
* **selectors** → CSS selectors for data fields.

---

## 7) Utilities

* `utils/helpers.js` contains helper functions:

  * `slugify()` → Generate safe filenames from URL.
  * `nowIso()` → Current timestamp in ISO format.
  * `dateKey()` → YYYY-MM-DD date string.
  * `chunk(array, size)` → Split an array into smaller batches.

---

## 8) How the Scraper Works

1. Accepts a list of targets from n8n or local JSON.
2. Launches **headless Chromium** with optional mobile emulation.
3. Visits each URL and extracts fields using CSS selectors.
4. Optionally captures **screenshots**.
5. Returns JSON results to the caller.
6. n8n can append results to Google Sheets and trigger notifications.

---

## 9) Running a Full Test Locally

```bash
npm run scrape
```

* Check output in: `sample_output/output.json`
* Screenshots (if enabled) saved in: `sample_output/`

---

## 10) Notes

* Batch scraping (3 targets at a time) reduces memory usage and prevents site blocks.
* Blocking images/fonts reduces network load and speeds up scraping.
* Use proper `JOB_SECRET` to prevent unauthorized access.
* For production, consider using **proxy rotation** or **rate limiting** for high-volume scraping.


