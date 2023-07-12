import { EmbedBuilder, type Interaction } from "discord.js";
import logger from "../utils/logger.js";

export default {
  event: "interactionCreate",
  once: false,
  run: (client, clientData: ClientData, interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild)
      return interaction
        .reply({
          content: "❌ Cannot execute command outside an server.",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    else if (!interaction.channel)
      return interaction
        .reply({
          content: "❌ Cannot get text channel.",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});

    const command = clientData.commands.get(interaction.commandName);

    if (!command)
      return interaction
        .reply({
          content: "❌ Invalid command!",
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});

    try {
      command.run(interaction, clientData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Something went wrong when running command")
        .setDescription("```js\n" + error.message + "\n```")
        .setTimestamp()
        .setColor("Blurple");
      interaction.reply({
        embeds: [embed],
      });
      logger.error(error.message, "commandHandeler", error);
    }
  },
} satisfies BotEvent;
