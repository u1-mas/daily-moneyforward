import { logger } from "./logger.ts";
import { launch } from "@astral/astral";

const email = Deno.env.get("MONEYFORWARD_EMAIL");
const password = Deno.env.get("MONEYFORWARD_PASSWORD");
if (email === undefined || password === undefined) {
  logger.error("not found email or password");
  Deno.exit(1);
}

const LOGIN_URL = "https://moneyforward.com/sign_in";
const browser = await launch({
  "headless": false,
});
const page = await browser.newPage();

await page.goto(LOGIN_URL);
const emailInput = await page.$('input[id="mfid_user[email]"]');
await emailInput?.type(email);
(await page.$('button[id="submitto"]'))?.click();

await page.waitForNavigation();
const passwordInput = await page.$('input[id="mfid_user[password]"]');
await passwordInput?.type(password);
(await page.$('button[id="submitto"]'))?.click();

await page.waitForNavigation({
  waitUntil: "networkidle2",
});
logger.info("login success");
