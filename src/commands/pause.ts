import colors from "../utils/colors.js";
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause current playing music"),
  run: (interaction: ChatInputCommandInteraction, clientData) => {
    if (!(interaction.member instanceof GuildMember)) throw new Error("Not in a guild");

    if (!clientData.players.get(interaction.guildId ?? "")) {
      const noPlayerEmbed = new EmbedBuilder()
        .setTitle("❌ Nothing is playing now")
        .setDescription("Use `/play` to play some music")
        .setColor(colors.danger);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      interaction
        .reply({ embeds: [noPlayerEmbed] })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    } else {
      if (interaction.guild?.members.me?.voice.channelId !== interaction.member.voice.channelId) {
        const differentEmbed = new EmbedBuilder()
          .setTitle("❌ Please join my channel")
          .setDescription("I'm already in another voice channel")
          .setColor(colors.danger);
        interaction
          .reply({ embeds: [differentEmbed] })
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {});
      }

      const currentPlayer = clientData.players.get(interaction.guildId ?? "");
      if (currentPlayer) {
        if (currentPlayer.status.paused) {
          const alreadyPauseEmbed = new EmbedBuilder()
            .setTitle("❌ Current song is already paused")
            .setDescription("Use `/resume` to resume current song")
            .setColor(colors.danger);
          interaction
            .reply({ embeds: [alreadyPauseEmbed] })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .catch(() => {});
        } else {
          return currentPlayer.pause(interaction);
        }
      }
    }
  },
} satisfies BotCommand;
