import { logger } from "./logger.ts";
import { launch } from "@astral/astral";
import dayjs from "dayjs";

async function main() {
  const email = Deno.env.get("MONEYFORWARD_EMAIL");
  const password = Deno.env.get("MONEYFORWARD_PASSWORD");
  if (email === undefined || password === undefined) {
    logger.error("not found email or password");
    Deno.exit(1);
  }

  const LOGIN_URL = "https://moneyforward.com/sign_in";
  const browser = await launch({
    headless: false,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
  });
  const page = await browser.newPage();

  await page.goto(LOGIN_URL);
  const emailInput = await page.$('input[id="mfid_user[email]"]');
  await emailInput?.type(email);
  await Promise.all([
    page.waitForNavigation(),
    (await page.$('button[id="submitto"]'))?.click(),
  ]);
  const passwordInput = await page.$('input[id="mfid_user[password]"]');
  await passwordInput?.type(password);
  await Promise.all([
    page.waitForNavigation(),
    (await page.$('button[id="submitto"]'))?.click(),
  ]);
  logger.info("login success");

  await page.goto("https://moneyforward.com/cf");

  const today = dayjs(new Date());
  logger.debug(`today: ${today.format("YYYY-MM-DD")}`);
  if (today.startOf("M").date() === today.date()) {
    await Promise.all([
      page.waitForNetworkIdle(),
      (await page.$(
        "#in_out > div.date_range.transaction-in-out-header > button.btn.fc-button.fc-button-prev.spec-fc-button-click-attached",
      ))?.click(),
    ]);
  }

  const yesterday = today.add(-1, "day");
  const list = await page.$$("#cf-detail-table > tbody > tr");
  const formattedList = await Promise.all(list.map(async (tr) => {
    const tds = await tr.$$("td");
    // tds[1] -> div -> span
    const datePromise = (await tds[1].$("div > span"))?.innerText();
    const contentPromise = (await tds[2].$("div > span"))?.innerText();
    const amountPromise = (await tds[3].$("div > span"))?.innerText();
    const [date, content, amount] = await Promise.all([
      datePromise,
      contentPromise,
      amountPromise,
    ]);
    // deno-lint-ignore no-non-null-assertion
    return { date: dayjs(new Date(date!)), content, amount: parseInt(amount!) };
  }));

  const yesterdayList = formattedList.filter((item) =>
    item.date.date() === yesterday.date()
  );
  await browser.close();

  const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");
  if (WEBHOOK_URL === undefined) {
    logger.error("not found webhook url");
    Deno.exit(1);
  }

  const total = yesterdayList.reduce((acc, { amount }) => acc + amount, 0);
  const payload = {
    content: `**${yesterday.format("YYYY-MM-DD")}** の支出合計: **${total}円**`,
    embeds: yesterdayList.map(({ content, amount }) => ({
      title: content,
      description: `金額: **${amount}円**`,
      color: amount < 0 ? 0xed2939 : 0x1f75fe,
    })),
  };
  const resp = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    logger.error(
      `failed to send message: ${resp.statusText}, ${await resp.text()}`,
    );
    Deno.exit(1);
  }
}

// 毎日8時に実行
Deno.cron("Run an eight hour", {
  hour: 23,
}, main);
