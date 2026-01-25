// Convert File to base64 string (without data URL prefix)
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get MIME type from File object
export function getMimeType(file) {
  return file.type;
}
