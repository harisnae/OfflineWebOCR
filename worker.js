import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

let pipe = null;
let pipelineTask = 'image-to-text';

// Function to load the model
async function loadModel(modelId) {
  pipelineTask = modelId.toLowerCase().includes('donut') ? 'document-question-answering' : 'image-to-text';
  try {
    pipe = await pipeline(pipelineTask, modelId, {
      progress_callback: (p) => {
        if (p && p.progress !== undefined) {
          self.postMessage({ type: 'progress', message: `Loading model "${modelId}" — this may be large.`, progress: p.progress });
        }
      }
    });
    self.postMessage({ type: 'progress', message: `Model Loaded: ${modelId} (task: ${pipelineTask})`, progress: 1 });
  } catch (err) {
    console.error(err);
    self.postMessage({ type: 'error', message: 'Error loading model: ' + (err?.message || err) });
  }
}

// Function to perform OCR
async function performOcr(inputDataUrl) {
  if (!pipe) {
    self.postMessage({ type: 'error', message: 'Load model first' });
    return;
  }

  try {
    let out;
    if (pipelineTask === 'document-question-answering') {
      const question = 'Please transcribe all visible text in the image. Preserve line breaks.';
      out = await pipe(inputDataUrl, question);
      let text = '';
      if (Array.isArray(out)) {
        text = out.map(o => o.answer ?? '').join('\n');
      } else if (typeof out === 'object' && out?.answer) {
        text = out.answer;
      } else {
        text = String(out);
      }
      self.postMessage({ type: 'result', raw: out, text: text });
    } else {
      out = await pipe(inputDataUrl, { max_new_tokens: 512 });
      const text = out?.[0]?.generated_text ?? out?.[0]?.text ?? (Array.isArray(out) ? out.join('\n') : String(out));
      self.postMessage({ type: 'result', raw: out, text: text });
    }
  } catch (err) {
    console.error(err);
    let msg = 'Inference error: ' + (err?.message || err);
    if ((err?.message || '').includes('Unsupported input type: object')) {
      msg += '\n\nSuggestion: pass a data URL string, a <canvas> element, or a URL string to the pipeline — not a raw Image DOM object.';
    }
    if (pipelineTask !== 'document-question-answering' && textOut.value && textOut.value.length < 8) {
      msg += '\n\nHint: TrOCR is tuned for single-line text — crop a single line or use a Donut document model from the model list for full screenshots.';
    }
    self.postMessage({ type: 'error', message: msg });
  }
}

// Listen for messages from the main script
self.onmessage = function(event) {
  const { type, modelId, inputDataUrl } = event.data;

  if (type === 'loadModel') {
    loadModel(modelId);
  } else if (type === 'runOcr') {
    performOcr(inputDataUrl);
  }
};
