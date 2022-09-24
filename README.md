# A Matrix Bot communicating via UDP/JSON with an esp32

## Setup
All code is located in `main.ts`. Further information is included 
in `package.json`, which also specifies that you can run `npm start` 
to launch the file `main.js`. To compile the TypeScript files to 
JavaScript run
```
tsc -p tsconfig.json
```

You need an `env.json` file that specifies at least
```json
{
    "homeserverUrl": "", // fill with your home server
    "accessToken": "", // your private access token
    "storage": "bot.json",
    "defaultRoomdId": "", // a default matrix room
    "ipAddress": "192.168.178.1", // ipv4 address of the esp32
    "port": 50000, // port for udp communication
    "key": "014a07fc...97f4a683" // 32byte hex string of the encryption key
}
```
>Make sure to exclude this file from code versioning as it contians your >secret/private access token.

The SDK used for the bit is the `matrix-bot-sdk` you can install it with `npm install matrix-bot-sdk` then use it in the code with `const sdk = require("matrix-bot-sdk");` Otherwise the the SDK version `0.5.17` is listed as a dependency in `package.json`. Then is sufficies to run `npm install`.  
=> https://github.com/turt2live/matrix-bot-sdk  


## Usage
You interact with the bot by sending message in a room in which the bot is presend. Currently the room has to be unencrypted for the bot to work.  

The bot listens on keywords that are prepended with a bot character for example `$`. The keywords are `help`, `bot`, `echo`, etc. `help` will show you a complete list of the available keywords.

## Docker
> **Warning:** The Docker file needs the JavaScript files.

If you would like to run the bot in a docker container, you can use the `Dockerfile` to build an image. Just run `docker build . -t bot:develop`. Then you can start the container with the given `docker-compose.yml` file. Make sure that the name under image is the same as you have set during the docker build process.