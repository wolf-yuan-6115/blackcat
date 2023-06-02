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
      chalk.green(sender ?? "未知") +
      " " +
      chalk.blue("資訊") +
      " " +
      message,
  );
}

export function warn(message: string, sender: string): void {
  console.log(
    getDateString() +
      " " +
      chalk.green(sender ?? "未知") +
      " " +
      chalk.yellowBright("警告") +
      " " +
      message,
  );
}

export function error(
  message: string,
  sender: string,
  error: Error,
): void {
  console.error(
    getDateString() +
      " " +
      chalk.green(sender ?? "未知") +
      " " +
      chalk.red("錯誤") +
      " " +
      message,
  );
  const spilted = error.stack?.split("\n");
  const prefixed = [];
  if (spilted) {
    for (const line of spilted) {
      prefixed.push(
        getDateString() + " " + chalk.yellow("偵錯") + " " + line,
      );
    }
    console.error(prefixed.join("\n"));
  }
}
