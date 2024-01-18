import Player from "../audio/Player.js";
import colors from "../utils/colors.js";
import {
  type ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption((option) =>
      option.setName("video").setDescription("YouTube link or search query").setRequired(true),
    ) as SlashCommandBuilder,
  run: (interaction: ChatInputCommandInteraction, clientData) => {
    if (!(interaction.member instanceof GuildMember)) {
      throw new Error("Not in a guild");
    } else {
      if (!interaction.member.voice.channel) {
        const noChannelEmbed = new EmbedBuilder()
          .setTitle("❌ You aren't in a voice channel")
          .setDescription("Join a voice channel first!")
          .setColor(colors.danger);
        interaction
          .reply({ embeds: [noChannelEmbed] })
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {});
        return;
      }
    }

    if (!clientData.players.get(interaction.guildId ?? "")) {
      const player = new Player(clientData, interaction);
      player.init();
      void player.play(interaction.options.getString("video", true), interaction);
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

      void clientData.players
        .get(interaction.guildId ?? "")
        ?.play(interaction.options.getString("video", true), interaction);
    }
  },
} satisfies BotCommand;
