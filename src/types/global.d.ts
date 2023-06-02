export {};

declare global {
  interface Config {
    token: string;
    cookie: string | void;
    optimize: boolean;
  }
}
