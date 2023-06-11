import {
  SlashCommandBuilder,
  EmbedBuilder,
  version,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Get bot information"),
  run: (interaction) => {
    const upSec = Math.floor(interaction.client.uptime / 1000);
    const upMin = Math.floor(upSec / 60);
    const upHrs = Math.floor(upMin / 60);
    const upDay = Math.floor(upHrs / 24);

    const embed = new EmbedBuilder()
      .setTitle("❓ Bot status")
      .setColor("Blurple")
      .setThumbnail(interaction.client.user.avatarURL())
      .addFields([
        {
          name: "🕘 Uptime",
          value: `${upDay} days ${upHrs} hours ${upMin} minutes ${upSec} seconds`,
        },
        {
          name: "🏃 Runtime environment",
          value: `Discord.js version: v${version} Node.js: ${process.version}`,
        },
      ]);
    console.log(embed);
  },
} satisfies BotCommand;
