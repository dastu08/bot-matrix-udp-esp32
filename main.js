const fs = require("fs");

// get the udp stuff
const dgram = require('dgram');
const udp = dgram.createSocket('udp4');

// get the matrix-bot-sdk stuff
const sdk = require("matrix-bot-sdk");
const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

// load configuration of homeserver, etc.
const config = JSON.parse(fs.readFileSync("env.json"));
const botChar = "$";
let lastRoomId = "";
let replyText = "";
let heartbeat_last = "never";
helpText = `Available commands:
${botChar}temperature
${botChar}pressure
${botChar}all
${botChar}listen <subcommand>
${botChar}heartbeat <subcommand>
${botChar}help
${botChar}bot
${botChar}whoami
${botChar}hello
${botChar}echo <message>
For help on the commands just type the commands without further arguments`;
helpListen = `Available subcommands:
on
off
interval <number>`;
helpHeartbeat = `Available subcommands:
on
off
interval <number>
last`


// matrix bot init
const storage = new SimpleFsStorageProvider(config.storage);
const bot = new MatrixClient(config.homeserverUrl, config.accessToken, storage);
AutojoinRoomsMixin.setupOnClient(bot);

// udp init
const port = 50000;
const IP4_BROADCAST = "192.168.179.30";
let listenFlag = false;
let listenContinousFlag = false;

// functions
function udp_send(msg) {
    udp.send(Buffer.from(msg), port, IP4_BROADCAST, (error) => {
        if (error) {
            console.log(error);
            udp.close();
        }
    });
    console.log(`<< ${IP4_BROADCAST}:${port} ${msg}`);
}

function bot_reply_notice(id, msg) {
    bot.sendMessage(id, {
        "msgtype": "m.notice",
        "body": msg
    });
    console.log(`<< ${id}: ${msg}`);
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

function handle_udp_message(obj) {
    let replyText = "";

    // switch on type value
    switch (obj.type) {
        // response it send after a get request
        case "response":
            if (obj.hasOwnProperty('quantity')) {
                if (obj.quantity.name == 'temperature') {
                    replyText += `${obj.time}: temperature = ${obj.quantity.value} ${obj.quantity.unit}. `;
                }
                if (obj.quantity.name == 'pressure') {
                    replyText += `${obj.time}: pressure = ${obj.quantity.value} ${obj.quantity.unit}. `;
                }
            }

            // abort if no room is available
            if (lastRoomId != "") {
                bot_reply_code(lastRoomId, replyText);
            }
            else {
                console.log("Empty room id");
            }
            break;

        // measurement is send periodically w/o a request
        case "measurement":
            if (listenContinousFlag &
                obj.hasOwnProperty('time') &
                obj.hasOwnProperty('quantity')) {
                replyText += `${obj.time}: `;
                obj.quantity.forEach(element => {
                    if (element.name == 'temperature') {
                        replyText += `temperature = ${element.value} ${element.unit}. `;
                    }
                    if (element.name == 'pressure') {
                        replyText += `pressure = ${element.value} ${element.unit}. `;
                    }
                });
                // replyText = `The pressure is ${obj.pressure} at ${obj.temperature} degrees celsius.`;
                // abort if no room is available
                if (lastRoomId != "") {
                    bot_reply_code(lastRoomId, replyText);
                }
                else {
                    console.log("Empty room id");
                }
            }
            break;

        case "heartbeat":
            heartbeat_last = obj.time;
            break;


        default:
            break;

    }
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
        console.log(`>> ${roomId}: ${sender} ${body}`);

        let res = { type: "" };

        let words = body.substring(1).toLowerCase().split(" ");
        lastRoomId = roomId;

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
                udp_send(JSON.stringify(res));
                break;

            case "pressure":
                res.type = "get";
                res.quantity = "pressure";
                udp_send(JSON.stringify(res));
                break;

            case "all":
                res.type = "get";
                res.quantity = ["temperature", "pressure"];
                udp_send(JSON.stringify(res));
                break;

            case "heartbeat":
                res.type = "set";

                switch (words[1]) {
                    case "on":
                        res.name = "heartbeat";
                        res.value = "on";
                        udp_send(JSON.stringify(res));
                        break;

                    case "off":
                        res.name = "heartbeat";
                        res.value = "off";
                        udp_send(JSON.stringify(res));
                        break;

                    case "interval":
                        res.name = "heartbeat_interval";
                        res.value = parseInt(words[2]);
                        udp_send(JSON.stringify(res));
                        break;

                    case "last":
                        bot_reply_code(roomId, `Last heartbeat: ${heartbeat_last}`);
                        break;

                    default:
                        bot_reply(roomId, helpHeartbeat);
                        break;
                }

                break;

            case "listen":
                switch (words[1]) {
                    case "on":
                        listenContinousFlag = true;
                        bot_reply_notice(roomId, "Start listening for measurements.");
                        break;

                    case "off":
                        listenContinousFlag = false;
                        bot_reply_notice(roomId, "Stop listening for measurements.");
                        break;

                    case "interval":
                        res.type = "set";
                        res.name = "measurement_interval";
                        res.value = parseInt(words[2]);
                        udp_send(JSON.stringify(res));
                        break;

                    default:
                        bot_reply_notice(roomId, helpListen);
                        break;
                }
                break;

            case "bot":
                bot_reply_notice(roomId, "I am a bot.");
                break;

            case "whoami":
                bot_reply_notice(roomId, sender);
                break

            case "hello":
                bot_reply_notice(roomId, `Hello ${sender.slice(1,sender.indexOf(':'))}!`);
                break


            case "echo":
                bot_reply_notice(roomId, body.substring("!echo".length).trim());
                break;

            case "help":
                // standard help
                bot_reply_notice(roomId, helpText);
                break;

            default:
                bot_reply_notice(roomId, `How can I help you?\nYou can write '${botChar}help' for help.`);
                break;
        }
    }
}

udp.on('error', (err) => {
    console.log(`udp server error:\n${err.stack}`);
    udp.close();
});

udp.on('message', (msg, rinfo) => {
    // assume message is in json format
    let obj = JSON.parse(msg.toString());

    console.log(`>> ${rinfo.address}:${rinfo.port} ${msg.toString()}`);

    // only send bot reply the udp message is correct
    if (obj.hasOwnProperty('type')) {
        handle_udp_message(obj);
    } else {
        bot_reply_notice("I could not handle the received UDP message.");
    }
});

udp.on('listening', () => {
    const address = udp.address();
    console.log(`udp server listening ${address.address}:${address.port}`);
});

udp.bind(port);
bot.on("room.message", handle_matrix_message);
bot.start().then(() => console.log("Bot started!"));
