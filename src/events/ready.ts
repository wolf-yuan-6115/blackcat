import logger from "../utils/logger.js";
import { ActivityType } from "discord.js";

export default {
  event: "ready",
  once: false,
  run(client, clientData) {
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
      .catch((error: unknown) => {
        let errorMessage = "Unknown message";
        if (error instanceof Error) errorMessage = error.message;
        logger.error(
          `Error when posting commands to Discord: ${errorMessage}`,
          "postready",
          error,
        );
      });

    client.user?.setPresence({
      status: "online",
      activities: [
        {
          name: "/help | Black cat OSS",
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
            name: "/help | Black cat OSS",
            type: ActivityType.Playing,
          },
        ],
      });
    }, 15_000);
  },
} satisfies BotEvent<"ready">;
