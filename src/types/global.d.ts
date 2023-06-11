import type { ClusterClient } from "discord-hybrid-sharding";
import type {
  Collection,
  SlashCommandBuilder,
  Snowflake,
  ChatInputCommandInteraction,
  ClientEvents,
  Client,
} from "discord.js";

export {};

declare global {
  interface Config {
    token: string;
    cookie: string;
    optimize: boolean;
    debug: undefined | boolean;
  }

  interface ClientData {
    config: Config;
    cluster: ClusterClient;
    commands: Collection<string, Command>;
    players: Collection<Snowflake, Player>;
  }

  interface BotCommand {
    data: SlashCommandBuilder;
    run(
      interaction: ChatInputCommandInteraction,
      clientData: ClientData,
    ): void;
  }

  interface BotEvent {
    event: keyof ClientEvents;
    once: boolean;
    run(client: Client, ...args: unknown[]): void;
  }
}
