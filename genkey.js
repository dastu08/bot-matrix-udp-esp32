// make sure to build the JS files before
aes256cbc = require("./build/aes-256-cbc.js")
console.log(aes256cbc.generateKey().toString("hex"));
