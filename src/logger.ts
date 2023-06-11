import chalk from "chalk";

function getDateString(): string {
  const month =
    (new Date().getMonth() + 1).toString().length === 1
      ? `0${new Date().getMonth() + 1}`
      : new Date().getMonth() + 1;
  const date =
    new Date().getDate().toString().length === 1
      ? `0${new Date().getDate()}`
      : new Date().getDate();
  const hours =
    new Date().getHours().toString().length === 1
      ? `0${new Date().getHours()}`
      : new Date().getHours();
  const minutes =
    new Date().getMinutes().toString().length === 1
      ? `0${new Date().getMinutes()}`
      : new Date().getMinutes();
  const seconds =
    new Date().getSeconds().toString().length === 1
      ? `0${new Date().getSeconds()}`
      : new Date().getSeconds();

  return (
    chalk.dim(`${month}/${date}`) +
    " " +
    chalk.cyan(`${hours}:${minutes}:${seconds}`)
  );
}

export function info(message: string, sender: string): void {
  console.log(
    getDateString() +
      " " +
      chalk.green(sender ?? "unknown") +
      " " +
      chalk.blue("info ") +
      " " +
      message,
  );
}

export function warn(message: string, sender: string): void {
  console.log(
    getDateString() +
      " " +
      chalk.green(sender ?? "Unknown") +
      " " +
      chalk.yellowBright("warn ") +
      " " +
      message,
  );
}

export function error(
  message: string,
  sender: string,
  error: Error | void,
): void {
  console.error(
    getDateString() +
      " " +
      chalk.green(sender ?? "unknown") +
      " " +
      chalk.red("error") +
      " " +
      message,
  );
  const spilted: string[] | undefined = error?.stack?.split("\n");
  const prefixed: string[] = [];
  if (spilted) {
    for (const line of spilted) {
      prefixed.push(
        getDateString() + " " + chalk.yellow("debug") + " " + line,
      );
    }
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
