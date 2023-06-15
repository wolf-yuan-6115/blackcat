import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export default {
  event: "interactionCreate",
  once: false,
  run: (
    client,
    clientData,
    interaction: ChatInputCommandInteraction,
  ) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild)
      return interaction.reply({
        content: "❌ Cannot execute command outside an server.",
      });
    else if (!interaction.channel)
      return interaction.reply({
        content: "❌ Cannot get text channel.",
      });

    const command = clientData.commands.get(interaction.commandName);

    if (!command)
      return interaction.reply({
        content: "❌ Invalid command!",
      });

    try {
      command.run(interaction, clientData);
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Something went wrong when running command")
        .setDescription("```js\n" + error.message + "\n```")
        .setTimestamp()
        .setColor("Blurple");
      interaction.reply({
        embeds: [embed],
      });
    }
  },
} satisfies BotEvent;
