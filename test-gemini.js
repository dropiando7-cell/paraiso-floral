const { GoogleGenAI } = require('@google/genai');

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: 'Di "IA de Compras Lista" en espanol'
    });
    console.log("RESPUESTA:", response.text);
  } catch (err) {
    console.error(err);
  }
}

run();
