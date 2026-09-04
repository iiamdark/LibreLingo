// OCR and Screen Capture text extraction service

export async function extractTextFromImage(fileOrBlob: Blob): Promise<string> {
  const base64 = await blobToBase64(fileOrBlob);

  // Check if OpenRouter key is available in config
  let apiKey = '';
  try {
    const cfg = JSON.parse(localStorage.getItem('librelingo_browser_config') || '{}');
    apiKey = cfg.openrouter?.apiKey || '';
  } catch {
    apiKey = '';
  }

  if (apiKey) {
    // High-accuracy multimodal OCR via OpenRouter (Gemini 2.0 Flash or GPT-4o-mini)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/iiamdark/LibreLingo',
          'X-Title': 'LibreLingo OCR'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcribe all visible text from this image exactly as written. Preserve line breaks. Output ONLY the raw transcribed text with zero explanation or quotes.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      const data = await res.json();
      const extracted = data.choices?.[0]?.message?.content?.trim();
      if (extracted) {
        return extracted;
      }
    } catch (err) {
      console.warn('OpenRouter Vision OCR failed:', err);
    }
  }

  // Fallback: Mock / notification if no vision key is configured
  return `[Image OCR: Detected image capture (${Math.round(fileOrBlob.size / 1024)} KB). Configure an OpenRouter API key in Settings to enable high-accuracy Vision AI transcription.]`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
