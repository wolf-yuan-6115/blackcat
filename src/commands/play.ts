import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import Player from "../audio/Player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption((option) =>
      option
        .setName("video")
        .setDescription("YouTube link or search query")
        .setRequired(true),
    ) as SlashCommandBuilder,
  run: (interaction: ChatInputCommandInteraction, clientData) => {
    if (!clientData.players.get(interaction.guildId ?? "")) {
      const player = new Player(clientData, interaction);
      player.init();
      player.play(
        interaction.options.getString("video", true),
        interaction,
      );
    } else {
      clientData.players.get(interaction.guildId ?? "")?.play;
    }
  },
} satisfies BotCommand;
