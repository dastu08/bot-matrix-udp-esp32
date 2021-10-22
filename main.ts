const fs = require("fs");

// load configuration of homeserver, etc.
const config = JSON.parse(fs.readFileSync("env.json"));

// get the esp-udp stuff
import * as  espudp from "./esp-udp";

// get the matrix-bot-sdk stuff
import { MatrixClient, SimpleFsStorageProvider } from "matrix-bot-sdk";
// const MatrixClient = sdk.MatrixClient;
// const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
// const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

// matrix bot init
const storage = new SimpleFsStorageProvider(config.storage);
const bot = new MatrixClient(config.homeserverUrl, config.accessToken, storage);
// AutojoinRoomsMixin.setupOnClient(bot);

const botChar = "$";
let lastRoomId: string = config.defaultRoomId;

const helpText = `Available commands:
${botChar}temperature
${botChar}pressure
${botChar}all
${botChar}listen <subcommand>
${botChar}heartbeat <subcommand>
${botChar}help
${botChar}bot
${botChar}whoami
${botChar}hello
${botChar}panic
${botChar}echo <message>
${botChar}admin <message>
For help on the commands just type the commands without further arguments`;
const helpListen = `Available subcommands:
on
off
interval <number>`;
const helpHeartbeat = `Available subcommands:
on
off
interval <number>
last`

type udpObjSend = {
    type: string;
    quantity?: string[];
    name?: string;
    value?: string | number;
}

// Send a message `body` to `roomId` of type `mstype` 
// msgtype is either "text" or "notice"
function bot_send(roomId: string, msgtype: string, body: string) {
    let content: object = {};
    // specify the message type via variable
    switch (msgtype) {
        case "text":
            content = {
                "msgtype": "m.text",
                "body": body
            };
            break;
        case "notice":
        default:
            content = {
                "msgtype": "m.notice",
                "body": body
            };
            break;
    }

    bot.sendMessage(roomId, content);
    console.log(`<< ${roomId}: ${body}`);
}

// Send the `msg` to different rooms debending on `level`
// level is "info", "error" or "debug"
function bot_reply(level: string, msg: string) {
    let roomId: string[] = [config.defaultRoomId];

    switch (level) {
        case "info":
            // try sending to the last room that asked
            if (lastRoomId != "") {
                roomId = [lastRoomId];
            } else {
                console.log("Empty room id, send it to default room.");
            }
            break;

        case "error":
            // send to the last room and the default room
            if (lastRoomId != "") {
                roomId.push(lastRoomId);
            }
            break;

        case "debug":
        default:
            // send to the default room
            break;
    }

    roomId.forEach(id => {
        bot_send(id, "notice", msg);
    });
}

// unused function
// format the message as source code
function bot_reply_code(id: string, msg: string) {
    bot.sendMessage(id, {
        "msgtype": "m.text",
        "body": msg,
        "format": "org.matrix.custom.html",
        "formatted_body": `<code>${msg}</code>`
    });
    console.log(`<< ${id}: ${msg}`);
}

// function handle for incoming matrix messages
// event is the default matrix event object
function matrix_message_handle(roomId: string, event: object) {
    // ignore emptly events
    if (!event["content"]) return;

    // ignore non-text events
    if (event["content"]["msgtype"] !== "m.text") return;

    // get message info
    const sender = event["sender"];
    const body = event["content"]["body"];

    // only listen on messages starting with the bot char
    if (body.startsWith(botChar)) {
        // remember room id
        lastRoomId = roomId;
        console.log(`>> ${roomId}: ${sender} ${body}`);

        // udp response object
        let res: udpObjSend = { type: "" };

        // split message into words, omitting the bot character
        let words: string[] = body.substring(1).toLowerCase().split(" ");
        let keyWord: string = words[0];

        // replace parts of the words with the full word
        if ("temperature".startsWith(keyWord)) {
            keyWord = "temperature";
        } else if ("pressure".startsWith(keyWord)) {
            keyWord = "pressure";
        } else if ("listen".startsWith(keyWord)) {
            keyWord = "listen";
        } else if ("heartbeat".startsWith(keyWord)) {
            keyWord = "heartbeat";
        }

        switch (keyWord) {
            case "temperature":
                res.type = "get";
                res.quantity = ["temperature"];
                espudp.send(JSON.stringify(res));
                break;

            case "pressure":
                res.type = "get";
                res.quantity = ["pressure"];
                espudp.send(JSON.stringify(res));
                break;

            case "all":
                res.type = "get";
                res.quantity = ["temperature", "pressure"];
                espudp.send(JSON.stringify(res));
                break;

            case "heartbeat":
            case "hb":
                res.type = "set";

                switch (words[1]) {
                    case "on":
                        res.name = "heartbeat";
                        res.value = "on";
                        espudp.send(JSON.stringify(res));
                        break;

                    case "off":
                        res.name = "heartbeat";
                        res.value = "off";
                        espudp.send(JSON.stringify(res));
                        break;

                    case "interval":
                        res.name = "heartbeat_interval";
                        res.value = parseInt(words[2]);
                        espudp.send(JSON.stringify(res));
                        break;

                    case "last":
                        bot_send(roomId, "notice", `Last heartbeat: ${espudp.getLastHeartbeat()}`);
                        break;

                    default:
                        bot_send(roomId, "notice", helpHeartbeat);
                        break;
                }
                break;

            case "listen":
                switch (words[1]) {
                    case "on":
                        espudp.listenOn();
                        bot_send(roomId, "notice", "Start listening for periodic measurements.");
                        break;

                    case "off":
                        espudp.listenOff();
                        bot_send(roomId, "notice", "Stop listening for periodic measurements.");
                        break;

                    case "interval":
                        res.type = "set";
                        res.name = "measurement_interval";
                        res.value = parseInt(words[2]);
                        espudp.send(JSON.stringify(res));
                        break;

                    default:
                        bot_send(roomId, "notice", helpListen);
                        break;
                }
                break;

            case "bot":
                bot_send(roomId, "notice", "I am a bot.");
                break;

            case "whoami":
                bot_send(roomId, "notice", sender);
                break

            case "hello":
                bot_send(roomId, "notice", `Hello ${sender.slice(1, sender.indexOf(':'))}!`);
                break

            case "echo":
                bot_send(roomId, "notice", body.substring("!echo".length).trim());
                break;

            case "admin":
                bot_send(config.defaultRoomId, "notice", `${sender}: ${body.substring("!admin".length).trim()}`);
                bot_send(lastRoomId, "notice", "Your message was send to the admin.");
                break;

            case "help":
                // standard help
                bot_send(roomId, "notice", helpText);
                break;

            case "panic":
                bot_send(roomId, "text", "🧻");
                break;

            case "easteregg":
                bot_send(roomId, "text", "🥚");
                break;

            default:
                bot_send(roomId, "notice", `How can I help you?\nYou can write '${botChar}help' for help.`);
                break;
        }
    }
}

if (config.port) {
    espudp.init(config.ipAddress, config.port);
} else {
    // omit port to use the default port
    espudp.init(config.ipAddress)
}

// start the udp stuff and specify the callback for received udp messages
espudp.start(bot_reply);

// specify the handler function for matrix messages
bot.on("room.message", matrix_message_handle);

// start the bot and send a message to the default room
bot.start().then(() => {
    console.log("Bot started!");
    bot_send(config.defaultRoomId, "notice", "Bot started!");
});
