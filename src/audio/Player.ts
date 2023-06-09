/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  type Client,
  type VoiceChannel,
  type TextBasedChannel,
  type User,
  type Guild,
  type ChatInputCommandInteraction,
  type Snowflake,
  type Message,
  type MessagePayload,
  type InteractionReplyOptions,
  StageChannel,
  GuildMember,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import {
  type VoiceConnection,
  type AudioPlayer,
  type AudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
} from "@discordjs/voice";
import {
  type YouTubeVideo,
  type YouTubeStream,
  type SoundCloudStream,
  search,
  video_info,
  playlist_info,
  setToken,
  stream as getStream,
} from "play-dl";
import colors from "../utils/colors.js";
import checkIsUrl from "../utils/checkIsUrl.js";
import logger from "../utils/logger.js";

enum RepeatState {
  Off,
  Single,
  All,
}

export default class Player {
  _client: Client;
  _clientData: ClientData;
  _textChannel: TextBasedChannel;
  _guild: Guild;
  _guildId: Snowflake;
  _voiceChannnel: VoiceChannel | StageChannel;
  _voiceChannelId: Snowflake;
  _audioPlayer: AudioPlayer;
  _connection: VoiceConnection;
  _controller: Message | null;
  _disableEffect: boolean;

  _init: boolean;
  _songs: SongInfo[];
  _paused: boolean;
  _muted: boolean;
  _repeat: RepeatState;
  _volume: number;
  _effects: EffectState;

  _deleted: boolean;

  _youtubeStream: YouTubeStream | SoundCloudStream;
  _audioResource: AudioResource;

  constructor(
    clientData: ClientData,
    interaction: ChatInputCommandInteraction,
  ) {
    this._client = interaction.client;
    this._clientData = clientData;
    this._disableEffect = clientData.config.optimize;
    if (!interaction.channel) {
      throw new Error("No channel given");
    } else {
      this._textChannel = interaction.channel;
    }
    if (!interaction.guild) {
      throw Error("No guild given");
    } else {
      this._guild = interaction.guild;
      this._guildId = interaction.guild.id;
    }
    if (!(interaction.member instanceof GuildMember)) {
      throw new Error("No voice channel given");
    } else if (!interaction.member.voice.channel) {
      throw new Error("Cannot find voice channel");
    } else {
      this._voiceChannnel = interaction.member?.voice.channel;
      this._voiceChannelId = interaction.member?.voice.channel?.id;
    }

    this._init = false;
    this._songs = [];
    this._paused = false;
    this._muted = false;
    this._repeat = RepeatState.Off;
    this._volume = 0.7;
    // @ts-ignore
    this._audioPlayer = null;
    // @ts-ignore
    this._connection = null;
    this._controller = null;
    this._effects = {
      Bassboost: false,
      Nightcore: false,
    };

    this._deleted = false;

    // @ts-ignore
    this._youtubeStream = null;
    // @ts-ignore
    this._audioResource = null;

    // Set youtube cookie if presents
    if (clientData.config.cookie) {
      setToken({ youtube: { cookie: clientData.config.cookie } });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _ignore() {}

  private _handelYoutubeErr(
    error: any,
    interaction: ChatInputCommandInteraction,
  ) {
    const errorEmbed: EmbedBuilder = new EmbedBuilder().setColor(
      colors.danger,
    );
    if (error.message.includes("confirm your age")) {
      errorEmbed.setTitle("😱 This video requires login");
    } else if (error.message.includes("429")) {
      errorEmbed.setTitle("😱 I got rate limited by YouTube!");
    } else if (error.message.includes("private")) {
      errorEmbed.setTitle("😱 This video is private");
    } else if (
      error.message.includes("This is not a YouTube Watch URL")
    ) {
      errorEmbed.setTitle("😱 YouTube video link is invalid");
    } else if (error.message.includes("This is not a Playlist URL")) {
      errorEmbed.setTitle("😱 YouTube playlist link is invalid");
    } else {
      errorEmbed.setTitle("😱 Something went wrong!");
    }
    logger.error(error.message, "player", error);
    this._reply(interaction, { embeds: [errorEmbed] });
  }

  private _reply(
    interaction: ChatInputCommandInteraction,
    payload: string | MessagePayload | InteractionReplyOptions,
  ) {
    if (interaction.replied)
      return interaction.followUp(payload).catch(this._ignore);
    else return interaction.reply(payload).catch(this._ignore);
  }

  async init() {
    if (this._init) return;

    try {
      this._connection = joinVoiceChannel({
        guildId: this._guildId,
        channelId: this._voiceChannelId,
        adapterCreator: this._guild.voiceAdapterCreator,
      });
    } catch (error: any) {
      logger.error(error.message, "playerinit", error);
      const joinVCEmbed = new EmbedBuilder()
        .setColor(colors.danger)
        .setTitle(
          "❌ Something went wrong when joining Voice Channel",
        )
        .setDescription("```" + error.message + "```");
      this._textChannel
        .send({ embeds: [joinVCEmbed] })
        .catch(this._ignore);
    }

    this._audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    this._connection.subscribe(this._audioPlayer);

    this._connection.on(VoiceConnectionStatus.Ready, () => {
      logger.info(
        `Player ${this._guildId} in channel ${this._voiceChannnel}`,
        "ready",
      );
    });
    this._connection.on(
      VoiceConnectionStatus.Disconnected,
      async () => {
        logger.warn(
          `Player ${this._guildId} in channel ${this._voiceChannnel}`,
          "disconnected",
        );
        try {
          await Promise.race([
            entersState(
              this._connection,
              VoiceConnectionStatus.Signalling,
              5_000,
            ),
            entersState(
              this._connection,
              VoiceConnectionStatus.Connecting,
              5_000,
            ),
          ]);

          logger.info(
            `Player ${this._guildId} in channel ${this._voiceChannnel}`,
            "reconnected",
          );
        } catch (error: any) {
          logger.warn(
            `Player ${this._guildId} in channel ${this._voiceChannnel}`,
            "left",
          );
          const leftEmbed = new EmbedBuilder()
            .setColor(colors.danger)
            .setTitle("😮 I can't reconnect to Voice Channel")
            .setDescription(
              "Looks like you've disconnected me from Voice Channel.",
            );
          this._textChannel
            .send({
              embeds: [leftEmbed],
            })
            .catch(this._ignore);
        }
      },
    );

    this._audioPlayer.on(AudioPlayerStatus.Playing, () =>
      logger.info(
        `Player ${this._guildId} in channel ${this._voiceChannnel}`,
        "playing",
      ),
    );
    this._audioPlayer.on(AudioPlayerStatus.Idle, () =>
      logger.info(
        `Player ${this._guildId} in channel ${this._voiceChannnel}`,
        "playing",
      ),
    );
    this._audioPlayer.on(AudioPlayerStatus.Buffering, () =>
      logger.info(
        `Player ${this._guildId} in channel ${this._voiceChannnel}`,
        "buffering",
      ),
    );

    this._init = true;
    this._clientData.players.set(this._guildId, this);

    if (this._voiceChannnel instanceof StageChannel) {
      await this._setSpeaker();
    }
  }

  private async _setSpeaker() {
    try {
      await entersState(
        this._connection,
        VoiceConnectionStatus.Ready,
        15_000,
      );
    } catch (_error: any) {
      return;
    }
    try {
      await this._guild.members.me?.voice.setSuppressed(false);
    } catch (_error: any) {
      const stageEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle("😱 I can't set myself as a stage speaker.")
        .setDescription(
          "You might need to set me as the stage speaker manually.",
        );
      this._textChannel
        .send({ embeds: [stageEmbed] })
        .catch(this._ignore);
    }
  }

  async play(song: string, interaction: ChatInputCommandInteraction) {
    const initEmbed = new EmbedBuilder()
      .setTitle("🔍 Looking for music")
      .setDescription(`Searching ${song}`)
      .setColor(colors.success);
    this._reply(interaction, { embeds: [initEmbed] });

    if (checkIsUrl(song)) {
      const url = new URL(song);
      const params = url.searchParams;

      if (params.has("list")) {
        if (params.has("v"))
          return this.loadPlaylistWithVideo(
            // @ts-expect-error
            params.get("v"),
            params.get("list"),
            interaction,
          );
        /*@ts-expect-error*/ else
          return this.loadPlaylist(params.get("list"), interaction);
      }

      if (params.get("v"))
        // @ts-expect-error
        return this.loadVideo(params.get("V"), interaction);
    } else {
      return this.loadSearch(song, interaction);
    }
  }

  private async loadSearch(
    query: string,
    interaction: ChatInputCommandInteraction,
  ) {
    let song: SongInfo;
    try {
      const result = await search(query, {
        limit: 1,
      });

      if (!result[0]?.url) {
        const noVidEmbed = new EmbedBuilder()
          .setTitle("❌ I can't find anything")
          .setDescription(`Query: ${query}`)
          .setColor(colors.danger);
        interaction;
        this._reply(interaction, { embeds: [noVidEmbed] });
      }

      const video = await video_info(result[0].url);
      song = this.parseData(video.video_details, interaction.user);
      this._songs.push(song);
      this.startStream(interaction);
    } catch (error: any) {
      this._handelYoutubeErr(error, interaction);
    }
  }

  private async loadPlaylistWithVideo(
    vid: string,
    pid: string,
    interaction: ChatInputCommandInteraction,
  ) {
    const chooseEmbed = new EmbedBuilder()
      .setTitle("🤔 Your link includes video and playlist")
      .setDescription("Which one do you want to add?");
    const vidBtn = new ButtonBuilder()
      .setCustomId("v")
      .setLabel("Video")
      .setEmoji("📽️")
      .setStyle(ButtonStyle.Success);
    const plBtn = new ButtonBuilder()
      .setCustomId("p")
      .setLabel("Whole Playlist")
      .setEmoji("🧾")
      .setStyle(ButtonStyle.Success);
    const actionRow =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        vidBtn,
        plBtn,
      );

    const replied = await this._reply(interaction, {
      embeds: [chooseEmbed],
      components: [actionRow],
    });

    if (replied) {
      let collected;
      try {
        collected = await replied.awaitMessageComponent({
          time: 10_000,
          filter: (action) => action.user.id === interaction.user.id,
          componentType: ComponentType.Button,
        });
      } catch {
        const ignoredEmbed = new EmbedBuilder()
          .setTitle("❌ Action canceled")
          .setColor(colors.danger)
          .setDescription("You didn't reply within 10 seconds.");
        this._reply(interaction, { embeds: [ignoredEmbed] });
      }

      if (collected?.customId === "v") {
        this.loadVideo(vid, interaction);
      } else {
        this.loadPlaylist(pid, interaction);
      }
    }
  }

  private async loadVideo(
    id: string,
    interaction: ChatInputCommandInteraction,
  ) {
    let song: SongInfo;
    try {
      const video = await video_info(id);
      song = this.parseData(video.video_details, interaction.user);
      this._songs.push(song);
      this.startStream(interaction);
    } catch (error: any) {
      this._handelYoutubeErr(error, interaction);
    }
  }

  private async loadPlaylist(
    id: string,
    interaction: ChatInputCommandInteraction,
  ) {
    let songs: SongInfo[];
    try {
      const playlist = await playlist_info(id);
      const videos = await playlist.all_videos();
      videos.forEach((i) => {
        songs.push(this.parseData(i, interaction.user));
      });
      this.startStream(interaction);
    } catch (error: any) {
      this._handelYoutubeErr(error, interaction);
    }
  }

  private parseData(data: YouTubeVideo, user: User): SongInfo {
    return {
      name: data.title,
      url: data.url,
      duration: data.durationInSec,
      queuedBy: user,
      thumbnail: data.thumbnails.pop()?.url,
    };
  }

  private async startStream(
    interaction: ChatInputCommandInteraction,
  ) {
    const readyEmbed = new EmbedBuilder()
      .setTitle("🔍 Getting ready to play song...")
      .setDescription(
        `Song name: ${this._songs[0].name ?? "unknown track"}`,
      )
      .setColor(colors.warning);

    const followedUp = await this._reply(interaction, {
      embeds: [readyEmbed],
    });

    try {
      this._youtubeStream = await getStream(this._songs[0].url);
    } catch (error) {
      this._handelYoutubeErr(error, interaction);
      this._songs.shift();
      return;
    }

    this._audioResource = createAudioResource(
      this._youtubeStream.stream,
      {
        inputType: this._youtubeStream.type,
        metadata: this._songs[0],
      },
    );
    this._audioPlayer.play(this._audioResource);
  }
}
