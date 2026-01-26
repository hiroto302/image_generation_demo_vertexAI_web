import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize Vertex AI with ADC
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

console.log('🔧 Initializing Vertex AI...');
console.log(`   Project ID: ${projectId}`);
console.log(`   Location: ${location}`);

const vertexAI = new VertexAI({
  project: projectId,
  location: location
});

// POST /api/generate-image
router.post('/', async (req, res) => {
  try {
    const { outfitBase64, outfitMimeType, personBase64, personMimeType } = req.body;

    if (!outfitBase64 || !personBase64) {
      return res.status(400).json({
        error: 'Both outfit and person images are required'
      });
    }

    console.log(`🎨 Generating image...`);
    console.log(`   Outfit: ${outfitMimeType}, ${Math.round(outfitBase64.length / 1024)}KB`);
    console.log(`   Person: ${personMimeType}, ${Math.round(personBase64.length / 1024)}KB`);

    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        maxOutputTokens: 32768,
        temperature: 1,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
      ]
    });

    const prompt = 'Create professional e-commerce fashion photos. Place the outfit from the first image onto the model in the second image. Generate realistic full-body shots of the model wearing the outfit, adjusting lighting and shadows to match an outdoor environment.';

    const request = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: outfitMimeType,
              data: outfitBase64
            }
          },
          {
            inlineData: {
              mimeType: personMimeType,
              data: personBase64
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K'
        }
      }
    };

    const response = await model.generateContent(request);

    let imageData = null;
    const candidates = response.response?.candidates;

    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageData = part.inlineData.data;
            console.log(`✅ Image generated: ${Math.round(imageData.length / 1024)}KB`);
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error('❌ No image data in response');
      return res.status(500).json({
        error: 'No image data received from Vertex AI'
      });
    }

    res.json({ imageData });

  } catch (error) {
    console.error('❌ Generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate image',
      details: error.details
    });
  }
});

export default router;
