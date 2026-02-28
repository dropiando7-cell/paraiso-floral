require('dotenv').config({ path: '.env.local' });
const { Twilio } = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
const to = "whatsapp:+50431715999";
const sid = "HXb561cc36fbcf6a4bc8b208d4768b3c09";

async function test() {
    console.log("TEST 3: With Newlines");
    try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                From: from,
                To: to,
                ContentSid: sid,
                ContentVariables: JSON.stringify({ "1": "Niño/a: Isaac Paz\nSalón: Héroes\nCódigo: XXX999" }),
                MediaUrl: "https://sistemaselim.app/api/checkin/pass?name=Isaac&room=Heroes&code=XXX999"
            })
        });
        console.log("T3 Status:", res.status);
        const json = await res.json();
        console.log("T3 Result:", json.message || json.sid);
    } catch (e) { console.error(e); }
}

test();
