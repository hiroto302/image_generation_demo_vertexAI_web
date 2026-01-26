import './style.css';
import { ImageUploader } from './components/ImageUploader.js';
import { generateFashionImage } from './api/vertexAI.js';

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
      <h1>Fashion Image Generator</h1>
      <p>Upload an outfit and a person image to generate professional e-commerce photos</p>
    </header>

    <div class="upload-section">
      <div class="upload-zone" id="outfit-zone">
        <div class="upload-placeholder" id="outfit-placeholder">
          <p>📷</p>
          <p>Drag & drop outfit image<br>or click to browse</p>
          <input type="file" accept="image/*" id="outfit-input" />
        </div>
        <div class="preview" id="outfit-preview" style="display:none;">
          <img alt="Outfit preview" />
          <button class="remove-btn" type="button">×</button>
        </div>
      </div>

      <div class="upload-zone" id="person-zone">
        <div class="upload-placeholder" id="person-placeholder">
          <p>👤</p>
          <p>Drag & drop person image<br>or click to browse</p>
          <input type="file" accept="image/*" id="person-input" />
        </div>
        <div class="preview" id="person-preview" style="display:none;">
          <img alt="Person preview" />
          <button class="remove-btn" type="button">×</button>
        </div>
      </div>
    </div>

    <button id="generate-btn" class="generate-button" disabled>
      Generate Fashion Image
    </button>

    <div id="loading" class="loading" style="display:none;">
      <p>Generating your fashion image... Please wait.</p>
    </div>

    <div id="result-section" class="result-section" style="display:none;">
      <h2>Generated Image</h2>
      <img id="result-image" alt="Generated fashion image" />
      <button id="download-btn" class="download-button" type="button">
        Download Image
      </button>
    </div>
  </div>
`;

const outfitUploader = new ImageUploader('outfit-zone', 'outfit-input', 'outfit-preview', 'outfit-placeholder');
const personUploader = new ImageUploader('person-zone', 'person-input', 'person-preview', 'person-placeholder');

let currentImageData = null;
const generateBtn = document.getElementById('generate-btn');

function checkBothImagesUploaded() {
  if (outfitUploader.getFile() && personUploader.getFile()) {
    generateBtn.disabled = false;
  } else {
    generateBtn.disabled = true;
  }
}

setInterval(checkBothImagesUploaded, 500);

generateBtn.addEventListener('click', async () => {
  const outfitFile = outfitUploader.getFile();
  const personFile = personUploader.getFile();

  if (!outfitFile || !personFile) {
    alert('Please upload both images');
    return;
  }

  generateBtn.disabled = true;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result-section').style.display = 'none';

  try {
    const imageData = await generateFashionImage(outfitFile, personFile);
    currentImageData = imageData;
    document.getElementById('result-image').src = `data:image/png;base64,${imageData}`;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
  } catch (error) {
    console.error('Generation failed:', error);
    alert('Failed to generate image. Please check console and try again.');
    document.getElementById('loading').style.display = 'none';
  } finally {
    generateBtn.disabled = false;
  }
});

document.getElementById('download-btn').addEventListener('click', () => {
  if (!currentImageData) return;
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${currentImageData}`;
  link.download = `fashion-image-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
