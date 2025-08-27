// worker.js  (module worker - use Worker(..., { type: 'module' }))

// Import the ESM build explicitly for more consistent exports
let transformersModule;
try {
  transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.esm.js');
} catch (err) {
  // fallback: try package entrypoint (less preferred)
  try {
    transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  } catch (err2) {
    self.postMessage({ type: 'error', message: 'Failed to import transformers module: ' + (err2?.message || err?.message || err) });
    throw err2 || err;
  }
}

// Try common export shapes
const pipeline = transformersModule.pipeline ?? transformersModule.default?.pipeline ?? transformersModule.transformers?.pipeline;
const env = transformersModule.env ?? transformersModule.default?.env ?? transformersModule.transformers?.env;

// If pipeline isn't found, abort with a helpful message
if (!pipeline) {
  self.postMessage({ type: 'error', message: 'transformers.pipeline not found. Module exports: ' + Object.keys(transformersModule).join(', ') });
  throw new Error('pipeline export missing from transformers module');
}

// Configure env so models are fetched from Hugging Face Hub rather than /models on your site
if (env) {
  env.localModelPath = null;
  env.remoteModelsPath = 'https://huggingface.co/';
} else {
  self.postMessage({ type: 'progress', message: 'Warning: env not exported; using library defaults (may try /models/...).' });
}

let pipe = null;
let pipelineTask = 'image-to-text';

// Load a model (invoked from main thread)
async function loadModel(modelId) {
  if (!modelId) {
    self.postMessage({ type: 'error', message: 'No modelId provided to loadModel' });
    return;
  }

  modelId = String(modelId).trim();
  pipelineTask = modelId.toLowerCase().includes('donut') ? 'document-question-answering' : 'image-to-text';

  self.postMessage({ type: 'progress', message: `Starting load of ${modelId}...`, progress: 0 });

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
    // Include the modelId in the message to help debugging
    self.postMessage({ type: 'error', message: 'Error loading model: ' + ((err?.message) || err) + '\nmodelId: ' + modelId });
  }
}

// Run OCR / inference (invoked from main thread)
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

// Listen for messages from the main script
self.onmessage = function(event) {
  const { type, modelId, inputDataUrl } = event.data;

  if (type === 'loadModel') {
    loadModel(modelId);
  } else if (type === 'runOcr') {
    performOcr(inputDataUrl);
  }
};
