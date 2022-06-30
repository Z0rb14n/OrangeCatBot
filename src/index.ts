import {OrangeCatBot} from "./bot";
module main {
    const bot = new OrangeCatBot();
    bot.login().catch(error => {
        console.log("oh noes...");
        console.error(error);
    });
}