const { GoogleGenAI } = require('@google/genai');
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const models = ['gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];
  for (const model of models) {
    try {
      const response = await genai.models.generateContent({
          model,
          contents: 'tell me a joke'
      });
      console.log(`Success with model ${model}:`, response.text);
      break;
    } catch (err) {
      console.error(`Error with model ${model}:`, err.message || err);
    }
  }
}
run();
