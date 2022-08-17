import * as crypto from "crypto";

const algo = "aes-256-cbc";

let key: Buffer = Buffer.from("9018321f988274f6a4eaf29c82df2614a296f9c06ca5776a893e1d0c9e35e1f9", "hex")

let iv: Buffer = Buffer.from("1111111111111111", "utf8");

const cipher = crypto.createCipheriv(algo, key, iv);
cipher.setAutoPadding(false);

let cipherText: Buffer = Buffer.from("", "hex");

let plainText: Buffer = Buffer.from("hello world and ", 'utf-8');
console.log(`Plain text: ${plainText.toString("hex")}`);

cipher.on("error", (err) => {
    console.log(err);
});
cipher.on("data", (chunk) => {
    // append chunk to cipherText buffer
    cipherText = Buffer.concat([cipherText, chunk]);
});
cipher.on("end", () => {
    console.log("Data encrypted");
    // callback(cipherText);
    console.log(`Cipher text length: ${cipherText.length}`);
    console.log(`Cipher text: ${cipherText.toString("hex")}`);
});

cipher.write(plainText, 'utf8');
cipher.end();

const decipher = crypto.createDecipheriv(algo, key, iv);
decipher.setAutoPadding(false);
let plainText2: Buffer = Buffer.from("", "hex");

decipher.on("error", (err) => {
    console.log(err);
});
decipher.on("data", (chunk) => {
    // save encrypted buffer chunk as a hex string
    // plainText2 += chunk.toString('utf8');
    plainText2 = Buffer.concat([plainText2, chunk]);
});
decipher.on("end", () => {
    console.log("Data decrypted");
    console.log(`Decrypted text length: ${plainText2.length}`);
    console.log(`Decrypted text: ${plainText2.toString("hex")}`);
});

decipher.write(cipherText);
decipher.end();