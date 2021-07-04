const fs = require("fs");

// load configuration of homeserver, etc.
const config = JSON.parse(fs.readFileSync("env.json"));

// get the esp-udp stuff
const espudp = require("./esp-udp");

// get the matrix-bot-sdk stuff
const sdk = require("matrix-bot-sdk");
const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
// const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

// matrix bot init
const storage = new SimpleFsStorageProvider(config.storage);
const bot = new MatrixClient(config.homeserverUrl, config.accessToken, storage);
// AutojoinRoomsMixin.setupOnClient(bot);

const botChar = "$";
let lastRoomId = config.defaultRoomId;
let heartbeat_last = "never";

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


function bot_reply(msg) {
    // abort if no previous room is available
    if (lastRoomId != "") {
        bot.sendMessage(lastRoomId, {
            "msgtype": "m.notice",
            "body": msg
        });
        console.log(`<< ${lastRoomId}: ${msg}`);
    }
    else {
        console.log("Empty room id");
    }
}

function bot_send(roomId, msgtype, body) {
    let content = {};
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

function bot_reply_code(id, msg) {
    bot.sendMessage(id, {
        "msgtype": "m.text",
        "body": msg,
        "format": "org.matrix.custom.html",
        "formatted_body": `<code>${msg}</code>`
    });
    console.log(`<< ${id}: ${msg}`);
}


async function handle_matrix_message(roomId, event) {
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

        let res = { type: "" };
        let words = body.substring(1).toLowerCase().split(" ");

        // replace parts of the words with the full word
        if ("temperature".startsWith(words[0])) {
            words[0] = "temperature";
        } else if ("pressure".startsWith(words[0])) {
            words[0] = "pressure";
        } else if ("listen".startsWith(words[0])) {
            words[0] = "listen";
        } else if ("heartbeat".startsWith([words[0]])) {
            words[0] = "heartbeat";
        }

        switch (words[0]) {
            case "temperature":
                res.type = "get";
                res.quantity = "temperature";
                espudp.send(JSON.stringify(res));
                break;

            case "pressure":
                res.type = "get";
                res.quantity = "pressure";
                espudp.end(JSON.stringify(res));
                break;

            case "all":
                res.type = "get";
                res.quantity = ["temperature", "pressure"];
                espudp.send(JSON.stringify(res));
                break;

            case "heartbeat":
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
                        listenContinousFlag = true;
                        bot_send(roomId, "notice", "Start listening for periodic measurements.");
                        break;

                    case "off":
                        listenContinousFlag = false;
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

espudp.init("192.168.179.30", 50000);
espudp.start(bot_reply);

bot.on("room.message", handle_matrix_message);
bot.start().then(() => {
    console.log("Bot started!");
    bot_send(config.defaultRoomId, "notice", "Hello World!");
});
