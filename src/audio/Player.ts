/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  type Client,
  type VoiceChannel,
  type TextBasedChannel,
  type Guild,
  type ChatInputCommandInteraction,
  type Snowflake,
  type Message,
  StageChannel,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import {
  type VoiceConnection,
  type AudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  createAudioPlayer,
  entersState,
} from "@discordjs/voice";
import logger from "../utils/logger.js";
import colors from "../utils/colors.js";
import { setToken } from "play-dl";

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

    // Set youtube cookie if presents
    if (clientData.config.cookie) {
      setToken({ youtube: { cookie: clientData.config.cookie } });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private ignore() {}

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
        .catch(this.ignore);
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
            .catch(this.ignore);
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
      await this.setSpeaker();
    }
  }

  private async setSpeaker() {
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
        .catch(this.ignore);
    }
  }
}
