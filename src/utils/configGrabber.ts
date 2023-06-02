import { existsSync, readFileSync } from "node:fs";
import * as logger from "../logger.js";

export default function (): Config | void {
  // Skip if config file is not found

  if (!existsSync("./config.json")) return;
  let parsed: Config = {
    token: "",
    cookie: "",
    optimize: false,
  };

  try {
    parsed = JSON.parse(readFileSync("./config.json", "utf-8"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Configuration error", "Config parser", error);
  }

  return parsed;
}
