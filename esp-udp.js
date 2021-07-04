// get the udp stuff
const dgram = require('dgram');
const udp = dgram.createSocket('udp4');

// udp init
var esp_udpport = 50000;
var esp_ipaddr = "192.168.179.30";
let listenContinousFlag = false;


exports.dummy = function () {
    console.log("Dummy function from the esp-udp module");
}

// port is optional
exports.init = function (ipaddr, port) {
    esp_ipaddr = ipaddr;

    if (port) {
        esp_udpport = port;
    }
}

exports.send = function (msg) {
    udp.send(Buffer.from(msg), esp_udpport, esp_ipaddr, (error) => {
        if (error) {
            console.log(error);
            udp.close();
        }
    });
    console.log(`<< ${esp_ipaddr}:${esp_udpport} ${msg}`);
}

function handle_udp_message(obj, callback) {
    let replyText = "";

    // switch on type value
    switch (obj.type) {
        // response it send after a get request
        case "response":
            if (obj.hasOwnProperty('quantity')) {
                if (obj.quantity.name == 'temperature') {
                    replyText += `temperature = ${obj.quantity.value} ${obj.quantity.unit}. `;
                }
                if (obj.quantity.name == 'pressure') {
                    replyText += `pressure = ${obj.quantity.value} ${obj.quantity.unit}. `;
                }
            }
            callback(replyText);
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
                callback(replyText);
            }
            break;

        case "heartbeat":
            heartbeat_last = obj.time;
            break;


        default:
            break;

    }
}


exports.start = function (callback) {
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
            handle_udp_message(obj, callback);
        } else {
            callback("I could not handle the received UDP message.");
        }
    });

    udp.on('listening', () => {
        const address = udp.address();
        console.log(`udp server listening ${address.address}:${address.port}`);
    });

    udp.bind(esp_udpport);
}
