// worker.js  (module worker - must be loaded with Worker(..., { type: 'module' }))

// Dynamically import the Transformers.js ESM entry from the CDN and handle multiple export shapes.
// Using dynamic import ensures we never call importScripts on an ESM bundle.
const transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');

// Try several export shapes so code works across CDN variations:
const pipeline = transformersModule.pipeline ?? transformersModule.default?.pipeline ?? (transformersModule.transformers && transformersModule.transformers.pipeline);
const env = transformersModule.env ?? transformersModule.default?.env ?? (transformersModule.transformers && transformersModule.transformers.env);

if (!pipeline) {
  self.postMessage({ type: 'error', message: 'Failed to load Transformers.js pipeline export.' });
  throw new Error('pipeline export missing from transformers module');
}

// Force models to be fetched from the Hugging Face Hub (not from /models on your site)
if (env) {
  env.localModelPath = null; // disable local /models lookups
  env.remoteModelsPath = 'https://huggingface.co/'; // ensure remote files come from Hugging Face Hub
}

// State
let pipe = null;
let pipelineTask = 'image-to-text';

// Load model (called from main thread)
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

// Run OCR / inference (called from main thread)
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
    self.postMessage({ type: 'error', message: msg });
  }
}

// Receive commands from main thread
self.onmessage = (event) => {
  const { type, modelId, inputDataUrl } = event.data;
  if (type === 'loadModel') {
    loadModel(modelId);
  } else if (type === 'runOcr') {
    performOcr(inputDataUrl);
  }
};
