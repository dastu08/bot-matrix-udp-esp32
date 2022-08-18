const fs = require("fs");

// load configuration of homeserver, etc.
const config = JSON.parse(fs.readFileSync("env.json"));

// get the esp-udp stuff
import * as  espudp from "./lib-esp32-udp/esp-udp";

// get the matrix-bot-sdk stuff
import { MatrixClient, SimpleFsStorageProvider } from "matrix-bot-sdk";

// matrix bot init
const storage = new SimpleFsStorageProvider(config.storage);
const bot = new MatrixClient(config.homeserverUrl, config.accessToken, storage);

const botChar = "$";
let lastRoomId: string = config.defaultRoomId;
let listenContinousFlag: boolean = false;
let heartbeat_last: string = "never";

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

// turn off continuous listening
export function listenOff() {
    listenContinousFlag = false;
}

// turn on continuous listening
export function listenOn() {
    listenContinousFlag = true;
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
        case "response":
            // try sending to the last room that asked
            if (lastRoomId != "") {
                roomId = [lastRoomId];
            } else {
                console.log("Empty room id, send it to default room.");
            }

            roomId.forEach(id => {
                bot_reply_code(id, msg);
            });
            break;

        case "measurement":
            if (listenContinousFlag) {
                roomId = [lastRoomId];
            }
            else {
                roomId = [];
            }

            roomId.forEach(id => {
                bot_reply_code(id, msg);
            });
            break;

        case "heartbeat":
            heartbeat_last = msg;
            msg = `Got heartbeat ${heartbeat_last}`;

            roomId.forEach(id => {
                bot_send(id, "notice", msg);
            });
            break;

        case "error":
            // send to the last room and the default room
            if (lastRoomId != "") {
                roomId.push(lastRoomId);
            }

            roomId.forEach(id => {
                bot_send(id, "notice", msg);
            });
            break;

        case "debug":
        default:
            // send to the default room
            roomId.forEach(id => {
                bot_send(id, "notice", msg);
            });
            break;
    }

}

// unused function
// format the message as source code
function bot_reply_code(id: string, msg: string) {
    bot.sendMessage(id, {
        "msgtype": "m.notice",
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
                espudp.get("temperature");
                break;

            case "pressure":
                espudp.get("pressure");
                break;

            case "all":
                espudp.get("all");
                break;

            case "heartbeat":
            case "hb":
                switch (words[1]) {
                    case "on":
                        espudp.set("heartbeat", "on");
                        break;

                    case "off":
                        espudp.set("heartbeat", "off");
                        break;

                    case "interval":
                        espudp.set("heartbeat_interval", parseInt(words[2]));
                        break;

                    case "last":
                        bot_send(roomId, "notice", `Last heartbeat: ${heartbeat_last}`);
                        break;

                    default:
                        bot_send(roomId, "notice", helpHeartbeat);
                        break;
                }
                break;

            case "listen":
                switch (words[1]) {
                    case "on":
                        listenOn();
                        bot_send(roomId, "notice", "Start listening for periodic measurements.");
                        break;

                    case "off":
                        listenOff();
                        bot_send(roomId, "notice", "Stop listening for periodic measurements.");
                        break;

                    case "interval":
                        espudp.set("listen_interval", parseInt(words[2]));
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


espudp.loggingDisable()
// espudp.loggingEnable()
// start the udp stuff and specify the callback for received udp messages
espudp.start(config.ipAddress, config.port, bot_reply);

// specify the handler function for matrix messages
bot.on("room.message", matrix_message_handle);

// start the bot and send a message to the default room
bot.start().then(() => {
    console.log("Bot started!");
    bot_send(config.defaultRoomId, "notice", "Bot started!");
});
