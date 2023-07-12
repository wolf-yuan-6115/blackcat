import Discord from "discord.js";
import fs from "node:fs";
import { ClusterClient, getInfo } from "discord-hybrid-sharding";
import configGrabber from "./utils/configGrabber.js";
import logger from "./utils/logger.js";

const client = new Discord.Client({
  intents: [
    Discord.IntentsBitField.Flags.Guilds,
    Discord.IntentsBitField.Flags.GuildVoiceStates,
  ],
  allowedMentions: {
    parse: ["users"],
    repliedUser: false,
  },
  presence: {
    status: "dnd",
    activities: [
      {
        name: "Loading",
        type: Discord.ActivityType.Playing,
      },
    ],
  },
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,
});
const clientData: ClientData = {
  config: configGrabber(),
  cluster: ClusterClient,
  commands: new Discord.Collection(),
  players: new Discord.Collection(),
};

if (clientData.config.debug) {
  client.on("debug", logger.debug);
}

const commandFiles: string[] = fs
  .readdirSync("./out/commands")
  .filter((file) => file.endsWith(".js"));
commandFiles.forEach(async (location: string) => {
  const command: BotCommand = (await import(`./commands/${location}`))
    .default;
  clientData.commands.set(command.data.name, command);
});

const eventFiles: string[] = fs
  .readdirSync("./out/events")
  .filter((file) => file.endsWith(".js"));
eventFiles.forEach(async (location: string) => {
  const event: BotEvent = (await import(`./events/${location}`))
    .default;

  if (event.once) {
    client.once(event.event, (...args: unknown[]) =>
      event.run(client, clientData, ...args),
    );
  } else {
    client.on(event.event, (...args: unknown[]) =>
      event.run(client, clientData, ...args),
    );
  }
});

client.login(clientData.config.token);
