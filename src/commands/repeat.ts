import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import colors from "../utils/colors.js";
import { RepeatState } from "../audio/Player.js";

export default {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Change player repeat state")
    .addStringOption((option) =>
      option
        .setName("state")
        .setDescription("Repeat state")
        .setRequired(true)
        .addChoices(
          { name: "All", value: "all" },
          { name: "Single", value: "single" },
          { name: "Off", value: "off" },
        ),
    ) as SlashCommandBuilder,
  run: (interaction: ChatInputCommandInteraction, clientData) => {
    if (!(interaction.member instanceof GuildMember))
      throw new Error("Not in a guild");

    if (!clientData.players.get(interaction.guildId ?? "")) {
      const noPlayerEmbed = new EmbedBuilder()
        .setTitle("❌ Nothing is playing now")
        .setDescription("Use `/play` to play some music")
        .setColor(colors.danger);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      interaction.reply({ embeds: [noPlayerEmbed] }).catch(() => {});
    } else {
      if (
        interaction.guild?.members.me?.voice.channelId !==
        interaction.member.voice.channelId
      ) {
        const differentEmbed = new EmbedBuilder()
          .setTitle("❌ Please join my channel")
          .setDescription("I'm already in another voice channel")
          .setColor(colors.danger);
        interaction
          .reply({ embeds: [differentEmbed] })
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {});
      }

      const repeatState = interaction.options.getString(
        "state",
        true,
      );
      let parsedState: RepeatState;
      switch (repeatState) {
        case "all":
          parsedState = RepeatState.All;
          break;
        case "single":
          parsedState = RepeatState.Single;
          break;
        case "off":
          parsedState = RepeatState.Off;
          break;
        default:
          parsedState = RepeatState.Off;
          break;
      }
      clientData.players
        .get(interaction.guildId ?? "")
        ?.repeat(interaction, parsedState);
    }
  },
} satisfies BotCommand;
