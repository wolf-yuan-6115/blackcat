import chalk from "chalk";

function getDateString(): string {
  const now = new Date();
  const pad = (num: number) => num.toString().padStart(2, "0");

  const month = pad(now.getMonth() + 1);
  const date = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${chalk.dim(`${month}/${date}`)} ${chalk.cyan(`${hours}:${minutes}:${seconds}`)}`;
}

function formatString(input: string) {
  return input + " ".repeat(Math.max(0, 25 - input.length));
}

export function info(message: string, sender = "unknown"): void {
  console.log(
    `${getDateString()} ${formatString(chalk.green(sender))}${chalk.blue("info")} ${message}`,
  );
}

export function warn(message: string, sender = "unknown"): void {
  console.log(
    `${getDateString()} ${formatString(chalk.green(sender))}${chalk.yellowBright("warn")} ${message}`,
  );
}

export function error(
  message: string,
  sender = "unknown",
  error?: unknown,
): void {
  console.error(
    `${getDateString()} ${formatString(chalk.green(sender))}${chalk.red("error")} ${message}`,
  );

  if (error instanceof Error) {
    const prefixed = (error.stack ?? "Stacktrace not available")
      .split("\n")
      .map(
        (line) =>
          `${getDateString()} ${formatString(chalk.yellow("debug"))}${line}`,
      );
    console.error(prefixed.join("\n"));
  }
}

export function debug(message: string): void {
  console.log(chalk.dim(message));
}

export default {
  info,
  warn,
  error,
  debug,
};
