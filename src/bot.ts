import configGrabber from "./utils/configGrabber.js";
import logger from "./utils/logger.js";
import { ClusterClient, getInfo } from "discord-hybrid-sharding";
import Discord from "discord.js";
import fs from "node:fs";

const client = new Discord.Client({
  intents: [Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildVoiceStates],
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
  .readdirSync("./dist/commands")
  .filter((file) => file.endsWith(".js"));

await Promise.all(
  commandFiles.map(async (location: string) => {
    const command = ((await import(`./commands/${location}`)) as ModuleType<BotCommand>).default;
    clientData.commands.set(command.data.name, command);
  }),
);

const eventFiles: string[] = fs.readdirSync("./dist/events").filter((file) => file.endsWith(".js"));
await Promise.all(
  eventFiles.map(async (location: string) => {
    const event = ((await import(`./events/${location}`)) as ModuleType<BotEvent>).default;
    if (event.once) {
      client.once(event.event, (...args: unknown[]) =>
        // @ts-expect-error args will be passed into unknown function
        event.run(client, clientData, ...args),
      );
    } else {
      client.on(event.event, (...args: unknown[]) =>
        // @ts-expect-error args will be passed into unknown function
        event.run(client, clientData, ...args),
      );
    }
  }),
);

void client.login(clientData.config.token);
