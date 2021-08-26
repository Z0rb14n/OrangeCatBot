
// @ts-check
const Discord = require("discord.js");
const config = require("./config.json");
const private_config = require("./private_config.json");
const ffmpeg = require("ffmpeg");

class OrangeCatBot {
    /**
     * @type {Discord.Client}
     */
    client = new Discord.Client();
    /**
     * @type {number[]}
     */
    surpriseArray = [];
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
            console.log(connection);
            const dispatcher = connection.play('./Bruh.wav');
            dispatcher.on("end",end => {
                console.log("Finished!");
                voiceChannel.leave();
            });
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
    clearCommand(args,msg){
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
                msg.channel.bulkDelete(amount,true);
            }
        }
    }
    /**
     * @param {string[]} args
     * @param {Discord.Message} msg
     * @returns {void}
     * */
    surpriseCommand(args,msg){
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
                setTimeout(()=>reply.then(value => {value.delete(); msg.delete();}),2000);
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
        if (cmdName == "bruh") {
            this.bruh(msg);
        } else if (cmdName == "set") {
            if (args[0] == "prefix" && args.length > 1) {
                msg.reply("Go kill yourself.");
            } else {
                msg.reply("Whatcha tryna even set?");
            }
        } else if (cmdName == "clear"){
            this.clearCommand(args,msg);
        } else if (cmdName === "surprise") {
            this.surpriseCommand(args,msg);
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
            if (this.surpriseArray[0] == 0) {
                this.surpriseArray.shift();
                msg.reply("Bruh that's some dumb stuff right there.");
            }
            for (var i = 0; i < this.surpriseArray.length; i++) {
                this.surpriseArray[i]--;
            }
        }
        if (msg.content.startsWith(config.prefix)) {
            let cmdWithoutPrefix = msg.content.substring(1);
            let stringArray = cmdWithoutPrefix.split(/ +/);
            this.runCommand(stringArray[0],stringArray.slice(1),msg);
        }
    }
}

module.exports = OrangeCatBot;
