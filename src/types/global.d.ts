import type { ClusterClient } from "discord-hybrid-sharding";
import type {
  Collection,
  Snowflake,
  ChatInputCommandInteraction,
  ClientEvents,
  Client,
  SlashCommandBuilder,
  ColorResolvable,
  User,
} from "discord.js";

export enum RepeatState {
  Off,
  Single,
  All,
}

declare global {
  interface Config {
    token: string;
    cookie: string;
    optimize: boolean;
    debug: undefined | boolean;
  }

  interface Colors {
    danger: ColorResolvable;
    warning: ColorResolvable;
    success: ColorResolvable;
  }

  interface ClientData {
    config: Config;
    cluster: ClusterClient;
    commands: Collection<string, BotCommand>;
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
    run(
      client: Client,
      clientData: ClientData,
      ...args: unknown[]
    ): void;
  }

  interface SongInfo {
    name: string | undefined;
    url: string;
    duration: number;
    queuedBy: User;
    thumbnail: string | undefined;
  }

  interface EffectState {
    Bassboost: boolean;
    Nightcore: boolean;
  }
}
