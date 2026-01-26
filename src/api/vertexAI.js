import { fileToBase64, getMimeType } from '../utils/fileHelpers.js';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api/generate-image';

export async function generateFashionImage(outfitFile, personFile) {
  if (!API_ENDPOINT) {
    throw new Error('API endpoint not configured');
  }

  console.log('🚀 Sending to backend:', API_ENDPOINT);

  const outfitBase64 = await fileToBase64(outfitFile);
  const personBase64 = await fileToBase64(personFile);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      outfitBase64,
      outfitMimeType: getMimeType(outfitFile),
      personBase64,
      personMimeType: getMimeType(personFile)
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Backend error:', errorData);
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Image received');

  return data.imageData;
}
