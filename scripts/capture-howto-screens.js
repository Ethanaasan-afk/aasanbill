const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const OUT = path.join(__dirname, "../public/marketing/howto");
const DEMO = process.env.CAPTURE_BASE || "http://127.0.0.1:3002";
const LIVE = process.env.LIVE_BASE || "http://127.0.0.1:3001";
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const HIDE = `
  nextjs-portal { display: none !important; }
  [role="dialog"][aria-label="Welcome tour"] { display: none !important; }
`;

async function shot(page, url, file, waitMs = 2200) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => {
    document.querySelectorAll("div").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t === "Demo Mode - data is not saved") el.remove();
    });
    document.querySelectorAll("button").forEach((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      if (t === "skip" || t === "skip tour") b.click();
    });
  });
  await new Promise((r) => setTimeout(r, waitMs));
  const dest = path.join(OUT, file);
  await page.screenshot({ path: dest, type: "png" });
  console.log("saved", dest);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1440, height: 900 },
    args: ["--hide-scrollbars", "--disable-gpu"],
  });
  const page = await browser.newPage();

  await shot(page, `${LIVE}/signup`, "signup.png", 1800);
  await shot(page, `${DEMO}/dashboard`, "dashboard.png", 2800);
  await shot(page, `${DEMO}/settings`, "settings.png", 2200);
  await shot(page, `${DEMO}/products`, "products.png", 2200);
  await shot(page, `${DEMO}/inventory`, "inventory.png", 2200);
  await shot(page, `${DEMO}/customers`, "customers.png", 2200);
  await shot(page, `${DEMO}/invoices`, "invoices-list.png", 2200);
  await shot(page, `${DEMO}/invoices/new`, "invoice.png", 2800);
  await shot(page, `${DEMO}/outstanding`, "outstanding.png", 2200);
  await shot(page, `${DEMO}/reports`, "reports.png", 2800);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
