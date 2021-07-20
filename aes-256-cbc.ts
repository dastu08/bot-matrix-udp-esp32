import * as crypto from "crypto";

const algo = "aes-256-cbc";

// generate a 256 bit key (32 bytes)
export function generateKey(): Buffer {
    // First, we'll generate the key. The key length is dependent on the algorithm.
    // In this case for aes256, it is 32 bytes (256 bits).
    let key: Buffer = crypto.randomFillSync(Buffer.alloc(32));
    console.log("Generated 256bit key");
    return key;
}

// generate a 16 byte initialiszation vector (IV)
export function generateIv(): Buffer {
    // aes block size is always 16 bytes
    const iv: Buffer = crypto.randomFillSync(Buffer.alloc(16));
    console.log('Generated iv');
    return iv;
}

// expect the plainText to be utf8 encoded.
export function encrypt(key: Buffer, iv: Buffer, plainText: string, callback: (cipherText: Buffer) => any) {
    // cipher can be now used as a stream
    const cipher = crypto.createCipheriv(algo, key, iv);

    let cipherText: Buffer = iv;

    cipher.on("error", (err) => {
        console.log(err);
    });
    cipher.on("data", (chunk) => {
        // append chunk to cipherText buffer
        cipherText = Buffer.concat([cipherText, chunk]);
    });
    cipher.on("end", () => {
        console.log("Data encrypted");
        callback(cipherText);
    });

    cipher.write(plainText, 'utf8');
    cipher.end();
}

export function decrypt(key: Buffer, cipherText: Buffer, callback: (plainText: string) => any) {
    // get iv as the beginning of the cipherText
    let iv = cipherText.slice(0, 16);
    // strip the iv from the rest of the message
    cipherText = cipherText.slice(16);

    // decipher can be now used as a stream
    const decipher = crypto.createDecipheriv(algo, key, iv);

    let plainText: string = "";

    decipher.on("error", (err) => {
        console.log(err);
    });
    decipher.on("data", (chunk) => {
        // save encrypted buffer chunk as a hex string
        plainText += chunk.toString('utf8')
    });
    decipher.on("end", () => {
        console.log("Data decrypted");
        callback(plainText);
    });

    decipher.write(cipherText);
    decipher.end();
}
