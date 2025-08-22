import express from "express";
import bodyParser from "body-parser";
import pino from "pino";
import { scrapeTargets } from "./scrape.js";
import fs from "fs/promises";
import path from "path";

const app = express();
const log = pino({ level: "info" });
app.use(bodyParser.json({ limit: "1mb" }));

const JOB_SECRET = process.env.JOB_SECRET || "change-me";

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  const s = req.headers["x-job-secret"];
  if (s !== JOB_SECRET) return res.status(403).json({ ok: false, error: "forbidden" });
  next();
});

// POST /run
app.post("/run", async (req, res) => {
  try {
    const payload = req.body || {};
    let targets = Array.isArray(payload.targets) ? payload.targets : [];

    if (targets.length === 0) {
      const file = path.join(process.cwd(), "config", "sites.json");
      const raw = await fs.readFile(file, "utf-8");
      targets = JSON.parse(raw);
    }

    targets = targets.filter(t => t && t.url && t.selectors);
    if (targets.length === 0) {
      return res.status(400).json({ ok: false, error: "no targets provided" });
    }

    const options = { screenshots: Boolean(payload?.options?.screenshots) };
    const { results, errors } = await scrapeTargets(targets, options);
    res.json({ ok: true, count: results.length, results, errors, at: new Date().toISOString() });
  } catch (err) {
    log.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server listening on", PORT);
});
