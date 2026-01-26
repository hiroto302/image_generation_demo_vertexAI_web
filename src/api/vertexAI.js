import { GoogleGenAI } from '@google/genai';
import { fileToBase64, getMimeType } from '../utils/fileHelpers.js';

const API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;

export async function generateFashionImage(outfitFile, personFile) {
  // WARNING: API key is exposed in client code. Use backend proxy for production.
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-3-pro-image-preview';

  const generationConfig = {
    maxOutputTokens: 32768,
    temperature: 1,
    topP: 0.95,
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "1K",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
    ],
  };

  const outfitBase64 = await fileToBase64(outfitFile);
  const personBase64 = await fileToBase64(personFile);

  const prompt = 'Create professional e-commerce fashion photos. Place the outfit from the first image onto the model in the second image. Generate realistic full-body shots of the model wearing the outfit, adjusting lighting and shadows to match an outdoor environment.';

  const message = [
    { text: prompt },
    { inlineData: { mimeType: getMimeType(outfitFile), data: outfitBase64 } },
    { inlineData: { mimeType: getMimeType(personFile), data: personBase64 } }
  ];

  const chat = ai.chats.create({ model, config: generationConfig });
  const response = await chat.sendMessageStream({ message });

  // Extract image data from streaming response
  let imageData = null;
  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
        }
      }
    }
  }

  if (!imageData) {
    throw new Error('No image data received from API');
  }

  return imageData;
}
