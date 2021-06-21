# A Matrix Bot communicating via UDP/JSON with an esp32

## Setup
All code is located in `main.js`. Further information is included in `package.json`, which also specifies that you can run `npm start` to launch the file `main.js`.

You need an `env.json` file that specifies at least
```json
{
    "homeserverUrl": "", // fill with your home server
    "accessToken": "", // your private access token
    "storage": "bot.json"
}
```
make sure to exclude this file from code versioning as it contians your secret/private access token.

The SDK used for the bit is the `matrix-bot-sdk` you can install it with `npm install matrix-bot-sdk` then use it in the code with `const sdk = require("matrix-bot-sdk");` Otherwise the the SDK version `0.5.17` is listed as a dependency in `package.json`. Then is sufficies to run `npm install`.  
=> https://github.com/turt2live/matrix-bot-sdk  

The default UDP port is `50000` which can be canged via the `port` variable.
The IP address of the other UDP device, like the esp32 must be specified in the variable `IP4_BROADCAST`. A compatible esp32 comfiguration is found in the project  
=> https://github.com/dastu08/esp32-weather-station

## Usage
You interact with the bot by sending message in a room in which the bot is presend. Currently the room has to be unencrypted for the bot to work.  

The bot listens on keywords that are prepended with a bot character for example `$`. The keywords are `help`, `bot`, `echo`, etc. `help` will show you a complete list of the available keywords.

## Docker
If you would like to run the bot in a docker container, you can use the `Dockerfile` to build an image. Just run `docker build . -t bot:develop`. Then you can start the container with the given `docker-compose.yml` file. Make sure that the name under image is the same as you have set during the docker build process.