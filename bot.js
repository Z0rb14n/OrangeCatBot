// @ts-check
const Discord = require("discord.js");
// @ts-ignore
const config = require("./config.json");
// @ts-ignore
const private_config = require("./private_config.json");
const ffmpeg = require("ffmpeg");
const ytdl = require('ytdl-core');

class OrangeCatBot {
    /**
     * @type {Discord.Client}
     */
    client = new Discord.Client();
    /**
     * @type {number[]}
     */
    surpriseArray = [];
    playQueue = new Map();

    /**
     *
     */
    constructor() {
        this.client.on("ready", () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
        });
        this.client.on("message", msg => {
            this.onMessageReceive(msg);
        });
    }

    /**
     * @param {Discord.Message} msg
     * @returns {void}
     */
    bruh(msg) {
        var voiceChannel = msg.member.voice.channel;
        if (voiceChannel == null) {
            msg.reply("Bruh ur not in a voice call LMAOOO");
            return;
        }
        voiceChannel.join().then(connection => {
            const dispatcher = connection.play('./Bruh.wav');
        }).catch(err => console.log(err));
    }

    /**
     * @returns {void}
     */
    login() {
        this.client.login(private_config.token);
    }

    /**
     * @param {string[]} args
     * @param {Discord.Message} msg
     * @returns {void}
     * */
    clearCommand(args, msg) {
        if (args.length > 1) {
            msg.reply("Lmao what with these extra arguments?");
        } else if (args.length < 1) {
            msg.reply("What's with the missing arguments?");
        } else {
            const amount = parseInt(args[0]);
            if (isNaN(amount)) {
                msg.reply("Bro that's not a number LOL.");
            } else if (amount < 2 || amount > 100) {
                msg.reply("Please enter your number between the likely range of your intelligence [2-100]");
            } else {
                // @ts-ignore
                msg.channel.bulkDelete(amount, true);
            }
        }
    }

    /**
     * @param {string[]} args
     * @param {Discord.Message} msg
     * @returns {void}
     * */
    surpriseCommand(args, msg) {
        if (args.length > 1) {
            msg.reply("Lmao what with these extra arguments?");
        } else if (args.length < 1) {
            msg.reply("What's with the missing arguments?");
        } else {
            const amount = parseInt(args[0]);
            if (isNaN(amount)) {
                msg.reply("Bro that's not a number LOL.");
            } else if (amount < 2) {
                msg.reply("It gotta be a good surprise bro. Set value to >=2.");
            } else {
                this.surpriseArray.push(amount);
                let reply = msg.reply("heheh");
                setTimeout(() => reply.then(value => {
                    value.delete();
                    msg.delete();
                }), 2000);
            }
        }
    }

    stop(message, serverQueue) {
        if (!message.member.voice.channel)
            return message.channel.send(
                "You have to be in a voice channel to stop the music!"
            );

        if (!serverQueue)
            return message.channel.send("There is no song that I could stop!");

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }

    skip(message, serverQueue) {
        if (!message.member.voice.channel)
            return message.channel.send(
                "Wat voice channel you at"
            );
        if (!serverQueue)
            return message.channel.send("No songs to skip LUL");
        serverQueue.connection.dispatcher.end();
    }

    play(guild, song) {
        const serverQueue = this.playQueue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            this.playQueue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url, {
                filter: 'audioonly',
                format: 'mp3',
                highWaterMark: 1<<25,
                quality: 'highestaudio'
            }))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(guild, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    }

    /**
     *
     * @param args {string[]}
     * @param msg {Discord.Message}
     */
    async playCommand(args, msg) {
        if (args.length < 0) {
            return msg.reply("Uhh... I think you need extra arguments LOL");
        } else {
            const serverQueue = this.playQueue.get(msg.guild.id);
            const voiceChannel = msg.member.voice.channel;
            if (!voiceChannel)
                return msg.reply("Gotta join a voice channel first lol");
            const permissions = voiceChannel.permissionsFor(msg.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return msg.reply("Can i has join and speak permissions???");
            }
            try {
                const songInfo = await ytdl.getInfo(args[0]).catch((reason) => {
                    console.log(reason);
                    msg.reply("Could not get video info.");
                });
                const song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                };
                if (!serverQueue) {

                } else {
                    serverQueue.songs.push(song);
                    console.log(serverQueue.songs);
                    return msg.channel.send(`${song.title} has been added to the queue!`);
                }
                const queueContract = {
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
                    this.play(msg.guild, queueContract.songs[0]);
                } catch (err) {
                    // Printing the error message if the bot fails to join the voicechat
                    console.log(err);
                    this.playQueue.delete(msg.guild.id);
                    return msg.channel.send(err);
                }
            } catch (err) {
                return msg.reply("oops.");
            }
        }
    }

    /**
     * @param {string} cmdName
     * @param {string[]} args
     * @param {Discord.Message} msg
     * @returns {void}
     * */
    runCommand(cmdName, args, msg) {
        if (cmdName === "bruh") {
            this.bruh(msg);
        } else if (cmdName === "set") {
            if (args[0] === "prefix" && args.length > 1) {
                msg.reply("Go kill yourself.");
            } else {
                msg.reply("Whatcha tryna even set?");
            }
        } else if (cmdName === "clear") {
            this.clearCommand(args, msg);
        } else if (cmdName === "surprise") {
            this.surpriseCommand(args, msg);
        } else if (cmdName === "play") {
            this.playCommand(args, msg)
        } else if (cmdName === "stop") {
            this.stop(msg, this.playQueue)
        } else if (cmdName === "skip") {
            this.skip(msg, this.playQueue)
        } else {
            msg.reply("Invalid command.");
        }
    }

    /**
     * @param {Discord.Message} msg
     * @returns void
     * */
    onMessageReceive(msg) {
        if (msg.author.bot) return;
        if (this.surpriseArray.length > 0) {
            if (this.surpriseArray[0] === 0) {
                this.surpriseArray.shift();
                msg.reply("Bruh that's some dumb stuff right there.");
            }
            for (let i = 0; i < this.surpriseArray.length; i++) {
                this.surpriseArray[i]--;
            }
        }
        if (msg.content.startsWith(config.prefix)) {
            let cmdWithoutPrefix = msg.content.substring(1);
            let stringArray = cmdWithoutPrefix.split(/ +/);
            this.runCommand(stringArray[0], stringArray.slice(1), msg);
        }
    }
}

module.exports = OrangeCatBot;
