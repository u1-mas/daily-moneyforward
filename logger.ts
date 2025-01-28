import * as log from "@std/log";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const formatter: log.FormatterFunction = (record) => {
  const serializedRecord = record.args.map((arg) => Deno.inspect(arg)).join(
    " ",
  );
  const datetime = record.datetime ?? new Date();
  return `[${record.levelName}] ${
    dayjs(datetime).tz().format("YYYY-MM-DD HH:mm:ss")
  } ${record.msg} ${serializedRecord}`;
};

log.setup({
  handlers: {
    // TODO: いい感じにする
    dev: new log.ConsoleHandler("DEBUG", {
      formatter,
      useColors: true,
    }),
    prod: new log.ConsoleHandler("INFO", {
      formatter,
      useColors: true,
    }),
  },
  loggers: {
    development: {
      level: "DEBUG",
      handlers: ["dev"],
    },
    production: {
      level: "INFO",
      handlers: ["prod"],
    },
  },
});
// export const logger = log.getLogger(isProd ? "production" : "development");
export const logger = log.getLogger("development");
