/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import checkIsUrl from "../utils/checkIsUrl.js";
import colors from "../utils/colors.js";
import secondsToDuration from "../utils/duration.js";
import logger from "../utils/logger.js";
import createProgressBar from "../utils/progressBar.js";
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
  type Client,
  type VoiceChannel,
  type TextBasedChannel,
  type User,
  type Guild,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Snowflake,
  type Message,
  type MessagePayload,
  type InteractionResponse,
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
  type YouTubeVideo,
  type YouTubeStream,
  type SoundCloudStream,
  search,
  video_info,
  playlist_info,
  setToken,
  stream as getStream,
} from "play-dl";

export enum RepeatState {
  Off,
  Single,
  All,
}

export interface EffectState {
  Bassboost: boolean;
  Nightcore: boolean;
}

export interface StatusData {
  guildId: Snowflake;
  playing: boolean;
  paused: boolean;
  repeat: RepeatState;
  effect: EffectState;
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
  _controller: Message | InteractionResponse | null;
  _updateInterval: ReturnType<typeof setInterval>;
  _disableEffect: boolean;

  _init: boolean;
  _songs: SongInfo[];
  _playedSong: SongInfo[];
  _playing: boolean;
  _paused: boolean;
  _muted: boolean;
  _repeat: RepeatState;
  _volume: number;
  _effects: EffectState;

  _youtubeStream: YouTubeStream | SoundCloudStream;
  _audioResource: AudioResource<SongInfo>;

  constructor(clientData: ClientData, interaction: ChatInputCommandInteraction) {
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
    this._playedSong = [];
    this._playing = false;
    this._paused = false;
    this._muted = false;
    this._repeat = RepeatState.Off;
    this._volume = 0.7;
    // @ts-expect-error
    this._audioPlayer = null;
    // @ts-expect-error
    this._connection = null;
    this._controller = null;
    // @ts-expect-error
    this._updateInterval = null;
    this._effects = {
      Bassboost: false,
      Nightcore: false,
    };

    // @ts-expect-error
    this._youtubeStream = null;
    // @ts-expect-error
    this._audioResource = null;

    if (clientData.config.cookie) {
      void setToken({
        youtube: { cookie: clientData.config.cookie },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _ignore() {}

  private _handelYoutubeErr(error: unknown, interaction: ChatInputCommandInteraction | undefined) {
    const errorEmbed: EmbedBuilder = new EmbedBuilder().setColor(colors.danger);
    let errorMessage = "Unknown error";
    if (error instanceof Error) errorMessage = error.message;
    if (errorMessage.includes("confirm your age")) {
      errorEmbed.setTitle("😱 This video requires login");
    } else if (errorMessage.includes("429")) {
      errorEmbed.setTitle("😱 I got rate limited by YouTube!");
    } else if (errorMessage.includes("private")) {
      errorEmbed.setTitle("😱 This video is private");
    } else if (errorMessage.includes("This is not a YouTube Watch URL")) {
      errorEmbed.setTitle("😱 YouTube video link is invalid");
    } else if (errorMessage.includes("This is not a Playlist URL")) {
      errorEmbed.setTitle("😱 YouTube playlist link is invalid");
    } else {
      errorEmbed.setTitle("😱 Something went wrong!");
    }
    logger.error(errorMessage, "player", error);
    if (interaction) this._reply(interaction, { embeds: [errorEmbed] }).catch(() => this._ignore());
    else this._textChannel?.send({ embeds: [errorEmbed] }).catch(() => this._ignore());
  }

  private _reply(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    payload: string | MessagePayload | InteractionReplyOptions,
  ) {
    if (interaction.replied) return interaction.followUp(payload);
    else return interaction.reply(payload);
  }

  get status(): StatusData {
    return {
      guildId: this._guildId,
      playing: this._playing,
      paused: this._paused,
      repeat: this._repeat,
      effect: this._effects,
    };
  }

  init() {
    if (this._init) return;

    try {
      this._connection = joinVoiceChannel({
        guildId: this._guildId,
        channelId: this._voiceChannelId,
        adapterCreator: this._guild.voiceAdapterCreator,
      });
    } catch (error: any) {
      let errorMessage = "Unknown Error";
      if (error instanceof Error) errorMessage = error.message;
      logger.error(errorMessage, "playerinit", error);
      const joinVCEmbed = new EmbedBuilder()
        .setColor(colors.danger)
        .setTitle("❌ Something went wrong when joining Voice Channel")
        .setDescription("```" + errorMessage + "```");
      this._textChannel?.send({ embeds: [joinVCEmbed] }).catch(() => this._ignore());
    }

    this._audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    this._connection.subscribe(this._audioPlayer);

    this._connection.on(VoiceConnectionStatus.Ready, () => {
      logger.info(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "ready");
    });
    this._connection.on(VoiceConnectionStatus.Disconnected, () => {
      logger.warn(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "disconnected");

      this._handelReconnect().catch(async () => {
        logger.warn(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "left");
        const leftEmbed = new EmbedBuilder()
          .setColor(colors.danger)
          .setTitle("😮 I can't reconnect to Voice Channel")
          .setDescription("Looks like you've disconnected me from Voice Channel.");
        await this._textChannel
          ?.send({
            embeds: [leftEmbed],
          })
          .catch();
      });
    });

    this._audioPlayer.on(AudioPlayerStatus.Playing, (): void =>
      logger.info(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "playing"),
    );
    this._audioPlayer.on(AudioPlayerStatus.Buffering, () =>
      logger.info(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "buffering"),
    );
    this._audioPlayer.on(AudioPlayerStatus.Idle, () => {
      logger.info(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "idle");

      void this.startStream(0);
    });

    this._init = true;
    this._clientData.players.set(this._guildId, this);

    if (this._voiceChannnel instanceof StageChannel) {
      void this._setSpeaker();
    }
  }

  private async _handelReconnect() {
    await Promise.race([
      entersState(this._connection, VoiceConnectionStatus.Signalling, 5_000),
      entersState(this._connection, VoiceConnectionStatus.Connecting, 5_000),
    ]);

    logger.info(`Player ${this._guildId} in channel ${this._voiceChannnel.id}`, "reconnected");
  }

  private async _setSpeaker() {
    try {
      await entersState(this._connection, VoiceConnectionStatus.Ready, 15_000);
    } catch (_error: any) {
      return;
    }
    try {
      await this._guild.members.me?.voice.setSuppressed(false);
    } catch (_error: any) {
      const stageEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle("😱 I can't set myself as a stage speaker.")
        .setDescription("You might need to set me as the stage speaker manually.");
      this._textChannel?.send({ embeds: [stageEmbed] }).catch(() => this._ignore());
    }
  }

  async play(song: string, interaction: ChatInputCommandInteraction) {
    const initEmbed = new EmbedBuilder()
      .setTitle("🔍 Looking for music")
      .setDescription(`Searching ${song}`)
      .setColor(colors.success);
    await this._reply(interaction, { embeds: [initEmbed] });

    if (checkIsUrl(song)) {
      const url = new URL(song);
      const params = url.searchParams;

      if (params.has("list")) {
        if (params.has("v")) return this.loadPlaylistWithVideo(song, interaction);
        else return this.loadPlaylist(song, interaction);
      }

      if (params.get("v")) return this.loadVideo(song, interaction);
    } else {
      return this.loadSearch(song, interaction);
    }
  }

  previous(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const skipPersonalEmbed = new EmbedBuilder()
      .setTitle("⏭️ Playing previous song")
      .setColor(colors.success);
    this._reply(interaction, {
      embeds: [skipPersonalEmbed],
      ephemeral: true,
    }).catch(() => this._ignore());

    const previousEmbed = new EmbedBuilder()
      .setTitle("⏭️ Playing previous song")
      .setDescription(
        `User \`${interaction.user.username}\` played previous song \`${this._audioResource.metadata.name}\``,
      )
      .setColor(colors.success)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL() ?? undefined,
      });
    this._textChannel
      ?.send({
        embeds: [previousEmbed],
      })
      .catch(() => this._ignore());

    this._songs.push(this._playedSong[0]);
    void this.startStream(0);
  }

  skip(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const skipPersonalEmbed = new EmbedBuilder()
      .setTitle("⏭️ Skipping current song")
      .setColor(colors.success);
    this._reply(interaction, {
      embeds: [skipPersonalEmbed],
      ephemeral: true,
    }).catch(() => this._ignore());

    const skippedEmbed = new EmbedBuilder()
      .setTitle("⏭️ Song skipped")
      .setDescription(`Skipped current song \`${this._audioResource.metadata.name}\``)
      .setColor(colors.success)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL() ?? undefined,
      });
    this._textChannel
      ?.send({
        embeds: [skippedEmbed],
      })
      .catch(() => this._ignore());

    void this.startStream(0);
  }

  repeat(interaction: ChatInputCommandInteraction | ButtonInteraction, repeatState: RepeatState) {
    let humanState;
    switch (repeatState) {
      case RepeatState.All:
        humanState = "`All`";
        break;
      case RepeatState.Single:
        humanState = "`Single`";
        break;
      case RepeatState.Off:
        humanState = "Turned off";
        break;
    }

    const repeatPersonalEmbed = new EmbedBuilder()
      .setTitle("🔁 Changed repeat mode")
      .setDescription(`Current repeat mode: ${humanState}`)
      .setColor(colors.success);
    this._reply(interaction, {
      embeds: [repeatPersonalEmbed],
      ephemeral: true,
    }).catch(() => this._ignore());

    const repeatEmbed = new EmbedBuilder()
      .setTitle("🔁 Current repeat mode changed")
      .setDescription(`Current repeat mode: ${humanState}`)
      .setColor(colors.success)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL() ?? undefined,
      });
    this._textChannel
      ?.send({
        embeds: [repeatEmbed],
      })
      .catch(() => this._ignore());
    this._repeat = repeatState;
  }

  pause(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const pausePersonalEmbed = new EmbedBuilder()
      .setTitle("⏸️ Paused corrent song")
      .setColor(colors.success);
    this._reply(interaction, {
      embeds: [pausePersonalEmbed],
      ephemeral: true,
    }).catch(() => this._ignore());

    const pauseEmbed = new EmbedBuilder()
      .setTitle("⏸️ Paused corrent song")
      .setColor(colors.success)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL() ?? undefined,
      });
    this._textChannel
      ?.send({
        embeds: [pauseEmbed],
      })
      .catch(() => this._ignore());
    this._paused = true;
    this._audioPlayer.pause(true);
  }

  resume(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const resumePersonalEmbed = new EmbedBuilder()
      .setTitle("▶️ Resume corrent song")
      .setColor(colors.success);
    this._reply(interaction, {
      embeds: [resumePersonalEmbed],
      ephemeral: true,
    }).catch(() => this._ignore());

    const resumeEmbed = new EmbedBuilder()
      .setTitle("▶️ Resume corrent song")
      .setColor(colors.success)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL() ?? undefined,
      });
    this._textChannel
      ?.send({
        embeds: [resumeEmbed],
      })
      .catch(() => this._ignore());
    this._paused = false;
    this._audioPlayer.unpause();
  }

  private async loadSearch(query: string, interaction: ChatInputCommandInteraction) {
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
        this._reply(interaction, { embeds: [noVidEmbed] }).catch(() => this._ignore());
        return;
      }

      const video = await video_info(result[0].url);
      song = this.parseData(video.video_details, interaction.user);
      this._songs.push(song);
      void this.startStream(1, interaction);
    } catch (error: any) {
      this._handelYoutubeErr(error, interaction);
    }
  }

  private async loadPlaylistWithVideo(url: string, interaction: ChatInputCommandInteraction) {
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
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(vidBtn, plBtn);

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
        this._reply(interaction, { embeds: [ignoredEmbed] }).catch(() => this._ignore());
      }

      collected?.deferUpdate().catch(() => this._ignore());
      replied.delete().catch(() => this._ignore());
      if (collected?.customId === "v") {
        await this.loadVideo(url, interaction);
      } else {
        const params = new URL(url).searchParams;
        //@ts-expect-error
        await this.loadPlaylist(params.get("list"), interaction);
      }
    }
  }

  private async loadVideo(id: string, interaction: ChatInputCommandInteraction) {
    let song: SongInfo;
    try {
      const video = await video_info(id);
      song = this.parseData(video.video_details, interaction.user);
      this._songs.push(song);
      void this.startStream(1, interaction);
    } catch (error: any) {
      this._handelYoutubeErr(error, interaction);
    }
  }

  private async loadPlaylist(id: string, interaction: ChatInputCommandInteraction) {
    try {
      const playlist = await playlist_info(id);
      const videos = await playlist.all_videos();
      videos.forEach((i) => {
        this._songs.push(this.parseData(i, interaction.user));
      });
      void this.startStream(videos.length, interaction);
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

  private async startStream(addedCount: number, interaction?: ChatInputCommandInteraction) {
    // No audio is playing currently
    if (this._playing && addedCount !== 0) {
      const addedEmbed = new EmbedBuilder().setTitle("✅ Added to queue").setColor(colors.success);

      if (addedCount === 1) {
        addedEmbed.setDescription(`Added \`${this._songs[this._songs.length - 1].name}\` to queue`);
      } else {
        addedEmbed.setDescription(`Added \`${addedCount}\` songs to queue`);
      }
      // Ignore if there is no interaction as its not possible to reply
      if (interaction) await this._reply(interaction, { embeds: [addedEmbed] });
      return;
    }

    if (this._songs.length === 0) {
      const stoppedEmbed = new EmbedBuilder()
        .setTitle("🛑 Music queue is empty")
        .setDescription("Playback has stopped after finishing all songs from the music queue.")
        .setColor("Blurple");

      this._textChannel.send({ embeds: [stoppedEmbed] }).catch(() => this._ignore());
    }

    const readyEmbed = new EmbedBuilder()
      .setTitle("🔍 Getting ready to play song...")
      .setDescription(`Song name: \`${this._songs[0].name ?? "unknown track"}\``)
      .setColor(colors.warning);

    const followedUp = interaction
      ? await this._reply(interaction, {
          embeds: [readyEmbed],
        }).catch(() => this._ignore())
      : await this._textChannel.send({ embeds: [readyEmbed] }).catch(() => this._ignore());

    try {
      this._youtubeStream = await getStream(this._songs[0].url);
    } catch (error) {
      this._handelYoutubeErr(error, interaction);
      this._songs.shift();
      return;
    }

    this._audioResource = createAudioResource<SongInfo>(this._youtubeStream.stream, {
      inputType: this._youtubeStream.type,
      metadata: this._songs[0],
    });
    this._audioPlayer.play(this._audioResource);
    this._playing = true;
    const current = this._songs.shift();
    if (current) {
      if (this._repeat === RepeatState.All) {
        this._songs.push(current);
      } else if (this._repeat === RepeatState.Single) {
        const firstSong = [current];
        this._songs = firstSong.concat(this._songs);
      } else {
        this._playedSong.push(current);
        if (this._playedSong.length > 10) {
          this._playedSong.pop();
        }
      }
    }

    if (followedUp) this.refreshController(false, followedUp);
  }

  private refreshController(recallInterval: boolean, bootstrap: Message | InteractionResponse) {
    if (bootstrap && !recallInterval) {
      this._controller = bootstrap;
    }
    if (!recallInterval) {
      clearInterval(this._updateInterval);
    }

    let repeatName = "",
      effectName = "";
    switch (this._repeat) {
      case RepeatState.Off:
        repeatName = "Off";
        break;
      case RepeatState.All:
        repeatName = "All";
        break;
      case RepeatState.Single:
        repeatName = "Single";
        break;
    }
    if (this._effects.Bassboost) effectName = effectName + "Bassboost ";
    if (this._effects.Nightcore) effectName = effectName + "Nightcore ";

    const controlEmbed = new EmbedBuilder()
      .setTitle("🎶 Start playing music")
      .setDescription(
        `**${this._audioResource.metadata.name ?? "Unknown Track"}**\n` +
          `[${secondsToDuration(this._audioResource.playbackDuration / 1000)}] ` +
          `${createProgressBar(
            Math.round(this._audioResource.playbackDuration / 1000),
            this._audioResource.metadata.duration,
          )} ` +
          `[${secondsToDuration(this._audioResource.metadata.duration)}]`,
      )
      .addFields(
        {
          name: "🖊️ Requester",
          value: this._audioResource.metadata.queuedBy.username,
          inline: true,
        },
        {
          name: "🎛️ Audio Effects",
          value: effectName.trim() || "None",
          inline: true,
        },
        {
          name: "🔁 Repeat mode",
          value: repeatName,
          inline: true,
        },
      )
      .setColor("Blurple");
    const previousButton = new ButtonBuilder()
      .setCustomId("back")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary);
    const playPauseButton = new ButtonBuilder()
      .setCustomId("play")
      .setEmoji("⏯️")
      .setStyle(ButtonStyle.Primary);
    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary);
    const stopButton = new ButtonBuilder()
      .setCustomId("stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger);
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      previousButton,
      playPauseButton,
      nextButton,
      stopButton,
    );

    bootstrap
      .edit({
        embeds: [controlEmbed],
        components: [buttons],
      })
      .then((message) => {
        this._controller = message;
        if (!recallInterval) {
          message
            .createMessageComponentCollector({
              componentType: ComponentType.Button,
            })
            .on("collect", (i) => this.buttonHandle(i));
        }
      })
      .catch(() => this._ignore());
    //.catch(this._ignore);
    if (this._updateInterval && !recallInterval) {
      this._updateInterval = setInterval(() => {
        if (this._controller) {
          this.refreshController(true, this._controller);
        }
      }, 15_000);
    }
  }

  private buttonHandle(interaction: ButtonInteraction) {
    switch (interaction.customId) {
      case "back":
        void this.previous(interaction);
        break;
      case "play":
        if (this._paused) {
          this.resume(interaction);
        } else {
          this.pause(interaction);
        }
        break;
      case "next":
        void this.skip(interaction);
        break;

      default:
        break;
    }
  }
}
