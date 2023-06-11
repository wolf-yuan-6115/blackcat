import { existsSync, readFileSync } from "node:fs";
import { error } from "../logger.js";

export default function (): Config {
  let parsed: Config = {
    token: "",
    cookie: "",
    optimize: false,
    debug: undefined,
  };
  if (!existsSync("./config.json")) return parsed;

  try {
    parsed = JSON.parse(readFileSync("./config.json", "utf-8"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (trace: any) {
    error("Configuration error", "Config parser", trace);
  }

  return parsed;
}
