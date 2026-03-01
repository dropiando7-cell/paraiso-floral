async function testTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = "whatsapp:+14155238886";
    const to = "whatsapp:+50431715999";
    const contentSid = "HXb5454650e9b4c3ae537b72b8cc121cb8";
    const mediaUrl = "https://sistemas-elim-app-demo.vercel.app/api/checkin/pass?name=Prueba&room=Elim&code=123456";

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    // Approach 1: Body Params with MediaUrl
    const bodyParams = new URLSearchParams();
    bodyParams.append("From", from);
    bodyParams.append("To", to);
    bodyParams.append("ContentSid", contentSid);
    bodyParams.append("ContentVariables", JSON.stringify({ "1": "Prueba Twilio API" }));
    bodyParams.append("MediaUrl", mediaUrl);

    // Approach 2: ContentVariables inside {{2}} instead of MediaUrl
    const bodyParams2 = new URLSearchParams();
    bodyParams2.append("From", from);
    bodyParams2.append("To", to);
    bodyParams2.append("ContentSid", contentSid);
    bodyParams2.append("ContentVariables", JSON.stringify({
        "1": "Prueba Twilio API Template Variable",
        "2": mediaUrl
    }));

    console.log("== Testing Approach 1 (MediaUrl parameter) ==");
    let res1 = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams,
        }
    );
    console.log(await res1.json());

    console.log("\n== Testing Approach 2 (ContentVariables parameter) ==");
    let res2 = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams2,
        }
    );
    console.log(await res2.json());
}

testTwilio().catch(console.error);
