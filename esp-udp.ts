// get the udp stuff
const dgram = require('dgram');
const udp = dgram.createSocket('udp4');

// udp init
var esp_udpport: number = 50000;
var esp_ipaddr: string = "192.168.179.30";
let listenContinousFlag: boolean = false;
let heartbeat_last: string = "never";

type espQuantity = {
    name: string;
    value: string;
    unit: string;
}

type udpObjReceive = {
    type: string;
    time: string;
    quantity?: espQuantity[];
}

// turn off continuous listening
export function listenOff() {
    listenContinousFlag = false;
}

// turn on continuous listening
export function listenOn() {
    listenContinousFlag = true;
}

// get the time value of the last heartbeat
export function getLastHeartbeat(): string {
    return heartbeat_last;
}

// set ip address and port
// port is optional
export function init(ipaddr: string, port?: number) {
    esp_ipaddr = ipaddr;

    if (port) {
        esp_udpport = port;
    }
}

// send `msg` via udp
export function send(msg: string) {
    udp.send(Buffer.from(msg), esp_udpport, esp_ipaddr, (error, bytes) => {
        if (error) {
            console.log(error);
            udp.close();
        }
        console.log(`<< ${esp_ipaddr}:${esp_udpport} (${bytes}bytes) ${msg}`);
    });
}

// function handle for incoming udp messages
// `obj` is the JSON object derived from the udp message string
// `callback(level: string, msg: string)` get called with information
// from the udp message  
function udp_message_handle(obj: udpObjReceive, callback: (level: string, message: string) => void) {
    let replyText = "";

    // switch on type value
    switch (obj.type) {
        // notify if the esp32 send a hello world event
        case "hello world":
            callback("debug", "ESP32 connected");
            break;

        // response it send after a get request
        case "response":
            obj.quantity.forEach(element => {
                if (element.name == "temperature") {
                    replyText += `temperature ${element.value} ${element.unit}, `;
                }
                if (element.name == "pressure") {
                    replyText += `pressure = ${element.value} ${element.unit}. `;
                }
            });
            callback("info", replyText);
            break;

        // measurement is send periodically w/o a request
        case "measurement":
            if (listenContinousFlag && obj.hasOwnProperty("time") && obj.hasOwnProperty("quantity")) {
                replyText += `${obj.time.slice(11)} : `;
                // loop through the list of quantity
                obj.quantity.forEach(element => {
                    if (element.name == "temperature") {
                        replyText += `${element.value} ${element.unit}, `;
                    }
                    if (element.name == "pressure") {
                        replyText += `${element.value} ${element.unit}. `;
                    }
                });
                callback("info", replyText);
            }
            break;

        // remember last hearbeat time
        case "heartbeat":
            heartbeat_last = obj.time;
            callback("debug", `Got heartbeat ${heartbeat_last.slice(11)}`);
            break;

        case "error":
            callback("error", "Got error");
            break;

        default:
            callback("error", "Unknown type");
            break;

    }
}

// start the udp stuff by defining event listerners and binding the socket to the port
// `callback(level: string, msg: string)` gets called to return information
// from the udp module
export function start(callback: (level: string, message: string) => void) {
    udp.on("error", (err) => {
        console.log(`udp server error:\n${err.stack}`);
        udp.close();
    });

    udp.on("message", (msg, rinfo) => {
        // assume message is in json format
        let obj = JSON.parse(msg.toString());

        console.log(`>> ${rinfo.address}:${rinfo.port} ${msg.toString()}`);

        // only send bot reply if the udp message is correct
        if (obj.hasOwnProperty("type")) {
            udp_message_handle(obj, callback);
        } else {
            callback("error", "I could not handle the received UDP message.");
        }
    });

    udp.on("listening", () => {
        const address = udp.address();
        console.log(`udp server listening ${address.address}:${address.port}`);
    });

    // start listening by binding to the port
    udp.bind(esp_udpport);
}
