import logger from "../utils/logger.js";
import { EmbedBuilder } from "discord.js";

export default {
  event: "interactionCreate",
  once: false,
  run: (client, clientData: ClientData, interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild)
      interaction
        .reply({
          content: "❌ Cannot execute command outside an server.",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    else if (!interaction.channel)
      interaction
        .reply({
          content: "❌ Cannot get text channel.",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});

    const command = clientData.commands.get(interaction.commandName);

    if (!command) {
      interaction
        .reply({
          content: "❌ Invalid command!",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
      return;
    }

    try {
      command.run(interaction, clientData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      const embed = new EmbedBuilder()
        .setTitle("❌ Something went wrong when running command")
        .setDescription("```js\n" + errorMessage + "\n```")
        .setTimestamp()
        .setColor("Blurple");
      interaction
        .reply({
          embeds: [embed],
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});

      logger.error(errorMessage, "commandHandeler", error);
    }
  },
} satisfies BotEvent<"interactionCreate">;
