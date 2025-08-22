import fs from "fs/promises";
import path from "path";
import { scrapeTargets } from "./scrape.js";

async function main() {
  const file = path.join(process.cwd(), "config", "sites.json");
  const raw = await fs.readFile(file, "utf-8");
  const targets = JSON.parse(raw);
  const { results, errors } = await scrapeTargets(targets, { screenshots: true });

  const outFile = path.join(process.cwd(), "sample_output", "output.json");
  await fs.writeFile(outFile, JSON.stringify({ results, errors }, null, 2), "utf-8");
  console.log("SAVED..", outFile);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
