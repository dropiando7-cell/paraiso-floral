const { GoogleGenAI } = require('@google/genai');

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await genai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: 'tell me a joke'
    });
    console.log(response.text);
  } catch (err) {
    console.error(err);
  }
}

run();
