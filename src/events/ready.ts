import logger from "../logger";
import { ActivityType } from "discord.js";

export default {
  event: "ready",
  once: false,
  async run(client, clientData) {
    logger.info(`${client.user?.username} is ready now`, "postready");
    const commands = clientData.commands.map((e) => e.data);

    client.application?.commands
      .set(commands)
      ?.then((returnd) => {
        logger.info(
          `${returnd.size} command successfully posted`,
          "postready",
        );
      })
      .catch((error) => {
        logger.error(
          `Error when posting commands to Discord: ${error.message}`,
          "postready",
          error,
        );
      });

    client.user?.setPresence({
      status: "online",
      activities: [
        {
          name: "/help | Bot ready!",
          type: ActivityType.Playing,
        },
      ],
    });

    // Update status every 15 seconds to prevent Discord clear it
    setInterval(() => {
      client.user?.setPresence({
        status: "online",
        activities: [
          {
            name: "/help",
            type: ActivityType.Playing,
          },
        ],
      });
    }, 15_000);
  },
} satisfies BotEvent;
