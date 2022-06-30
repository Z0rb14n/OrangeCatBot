import * as Discord from "discord.js";
import * as ffmpeg from "ffmpeg";
import ytdlcore from "ytdl-core";
import {Message} from "discord.js";

const config = require("../config.json");
const private_config = require("../private_config.json");

export class OrangeCatBot {
    client: Discord.Client = new Discord.Client();
    surpriseArray: number[] = [];
    playQueue: Map<string, QueueContract> = new Map<string, QueueContract>();

    constructor() {
        this.client.on("ready", () => {
            if (this.client.user == null)
                console.log("Client user null!!");
            else
                console.log(`Logged in as ${this.client.user.tag}!`);
        });
        this.client.on("message", msg => {
            this.onMessageReceive(msg).catch(error => {
                console.error("error on message: " + msg);
                console.error(error);
            });
        });
    }

    async bruh(msg: Discord.Message): Promise<Discord.Message | null> {
        const voiceChannel = msg.member?.voice.channel;
        if (voiceChannel == null) {
            return msg.reply("Bruh ur not in a voice call LMAOOO");
        }

        try {
            console.log("joining...");
            voiceChannel.join().then(connection => {
                const dispatcher = connection.play("./Bruh.wav");
                dispatcher.on("close",() => {
                    voiceChannel.leave();
                })
            });
            return msg.channel.send("bruh.");
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    login(): Promise<string> {
        return this.client.login(private_config.token);
    }

    async clearCommand(args: string[], msg: Discord.Message): Promise<Discord.Message | null> {
        if ((msg.channel instanceof Discord.DMChannel)) {
            return null;
        }
        if (args.length > 1)
            return msg.reply("Lmao what with these extra arguments?");
        if (args.length < 1)
            return msg.reply("What's with the missing arguments?");
        const amount = parseInt(args[0]);
        if (isNaN(amount))
            return msg.reply("Bro that's not a number LOL.");
        if (amount < 2 || amount > 100)
            return msg.reply("Please enter your number between the likely range of your intelligence [2-100]");

        await msg.channel.bulkDelete(amount, true);
        return msg.reply("Deleted " + amount + " messages.");
    }

    /**
     * @return null if successful; promise to error message
     */
    async surpriseCommand(args: string[], msg: Discord.Message): Promise<Message | null> {
        if (args.length > 1)
            return msg.reply("Lmao what with these extra arguments?");
        if (args.length < 1)
            return msg.reply("What's with the missing arguments?");
        const amount = parseInt(args[0]);
        if (isNaN(amount))
            return msg.reply("Bro that's not a number LOL.");
        if (amount < 2)
            return msg.reply("It gotta be a good surprise bro. Set value to >=2.");
        this.surpriseArray.push(amount);
        try {
            let reply = await msg.reply("heheh");
            await delay(2000);
            await reply.delete();
            await msg.delete();
        } catch (e) {
            console.log(e);
        }
        return null;
    }

    stop(message: Discord.Message): Promise<Discord.Message> {
        if (!message.member?.voice.channel)
            return message.channel.send("You have to be in a voice channel to stop the music!");
        if (message.guild == null)
            return message.channel.send("You're not in a server for some reason.");
        const serverQueue = this.playQueue.get(message.guild.id);

        if (!serverQueue)
            return message.channel.send("There is no song that I could stop!");

        serverQueue.songs = [];
        serverQueue.connection?.dispatcher.end();
        return message.channel.send("Stopped!");
    }

    skip(message: Discord.Message): Promise<Discord.Message> {
        if (!message.member?.voice.channel)
            return message.channel.send("Wat voice channel you at");
        if (message.guild == null)
            return message.channel.send("You're not in a server for some reason.");
        const serverQueue = this.playQueue.get(message.guild.id);
        if (!serverQueue)
            return message.channel.send("No songs to skip LUL");
        serverQueue.connection?.dispatcher.end();
        return message.channel.send("Skipped!");
    }

    async play(guild: Discord.Guild, song: Song): Promise<void> {
        const serverQueue = this.playQueue.get(guild.id);
        if (serverQueue == null) {
            console.error("null server queue on play()");
            return;
        }
        if (!song) {
            serverQueue.voiceChannel.leave();
            this.playQueue.delete(guild.id);
            return;
        }
        if (serverQueue.connection == null) {
            console.error("no connection on play()");
            return;
        }
        try {
            const dispatcher = await serverQueue.connection.play(ytdlcore(song.url, {
                    filter: 'audioonly',
                    //format: 'mp3',
                    highWaterMark: 1 << 25,
                    quality: 'highestaudio'
                }));
            serverQueue.songs.shift();
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
            serverQueue.textChannel.send(`Start playing: **${song.title}**`);
            await this.play(guild, serverQueue.songs[0]);
        } catch (e) {
            console.error(e);
        }
    }

    async playCommand(args: string[], msg: Discord.Message): Promise<Discord.Message | null> {
        if (!(msg.channel instanceof Discord.TextChannel)) {
            return null;
        }
        if (msg.guild == null || msg.member == null) return null;

        if (args.length < 0) {
            return msg.reply("Uhh... I think you need extra arguments LOL");
        }
        const serverQueue = this.playQueue.get(msg.guild.id);
        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel)
            return msg.reply("Gotta join a voice channel first lol");
        if (this.client.user == null)
        {
            console.log("Null client user????");
            return msg.reply("._. how am i not a client");
        }
        const permissions = voiceChannel.permissionsFor(this.client.user);
        if (!permissions?.has("CONNECT") || !permissions?.has("SPEAK")) {
            return msg.reply("Can i has join and speak permissions???");
        }
        let songInfo: ytdlcore.videoInfo;
        try {
            songInfo = await ytdlcore.getInfo(args[0]);
        } catch (e: any) {
            console.log(e);
            return msg.reply("Could not get video info.");
        }
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        if (serverQueue) {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return msg.channel.send(`${song.title} has been added to the queue!`);
        }
        const queueContract: QueueContract = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };
        // Setting the queue using our contract
        this.playQueue.set(msg.guild.id, queueContract);
        // Pushing the song to our songs array
        queueContract.songs.push(song);

        try {
            // Here we try to join the voice chat and save our connection into our object.
            queueContract.connection = await voiceChannel.join();
            // Calling the play function to start a song
            await this.play(msg.guild, queueContract.songs[0]);
        } catch (err) {
            // Printing the error message if the bot fails to join the voice chat
            console.log(err);
            this.playQueue.delete(msg.guild.id);
            return msg.channel.send("Error on joining/playing: " + err);
        }

        return msg.channel.send("Playing: " + song);
    }

    async runCommand(cmdName: string, args: string[], msg: Discord.Message): Promise<void> {
        if (cmdName === "bruh") {
            await this.bruh(msg);
            return;
        }
        if (cmdName === "set") {
            if (args[0] === "prefix" && args.length > 1) {
                await msg.reply("hehe not implemented");
            } else {
                await msg.reply("Whatcha tryna even set?");
            }
            return;
        }
        if (cmdName === "clear") {
            await this.clearCommand(args, msg);
            return;
        }
        if (cmdName === "surprise") {
            await this.surpriseCommand(args, msg);
            return;
        }
        if (cmdName === "play") {
            await this.playCommand(args, msg);
            return;
        }
        if (cmdName === "stop") {
            await this.stop(msg);
            return;
        }
        if (cmdName === "skip") {
            await this.skip(msg);
            return;
        }
        await msg.reply("Invalid command.");
    }

    async onMessageReceive(msg: Discord.Message): Promise<void> {
        if (msg.author.bot) return;
        if (this.surpriseArray.length > 0) {
            if (this.surpriseArray[0] === 0) {
                this.surpriseArray.shift();
                await msg.reply("Bruh that's some dumb stuff right there.");
            }
            for (let i = 0; i < this.surpriseArray.length; i++) {
                this.surpriseArray[i]--;
            }
        }
        if (msg.content.startsWith(config.prefix)) {
            let cmdWithoutPrefix = msg.content.substring(1);
            let stringArray = cmdWithoutPrefix.split(/ +/);
            await this.runCommand(stringArray[0], stringArray.slice(1), msg);
        }
    }
}

class Song {
    title!: string;
    url!: string;
}

class QueueContract {
    textChannel!: Discord.TextChannel;
    voiceChannel!: Discord.VoiceChannel;
    connection: Discord.VoiceConnection | null = null;
    songs: Song[] = [];
    volume: number = 1;
    playing: boolean = false;
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));