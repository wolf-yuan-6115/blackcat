import { error } from "./logger.js";
import { existsSync, readFileSync } from "node:fs";

function configValidator(config: unknown): config is Config {
  return Object.prototype.hasOwnProperty.call(config, "token");
}

export default function (): Config {
  let config: Config = {
    token: "",
    cookie: "",
    optimize: false,
    debug: undefined,
    driver: "native",
  };
  if (!existsSync("./config.json")) return config;

  try {
    const parsed: unknown = JSON.parse(readFileSync("./config.json", "utf-8"));
    if (!configValidator(parsed))
      throw new Error("Config file does not match expected config structure");
    config = parsed;
  } catch (trace: unknown) {
    error("Configuration error", "Config parser", trace);
  }

  return config;
}
