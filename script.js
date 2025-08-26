const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const modelSelect = document.getElementById('modelSelect');
const loadBtn = document.getElementById('loadBtn');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const imageInput = document.getElementById('imageInput');
const sampleBtn = document.getElementById('sampleBtn');
const removeBtn = document.getElementById('removeBtn');
const runOcrBtn = document.getElementById('runOcrBtn');
const rawOut = document.getElementById('rawOut');
const textOut = document.getElementById('textOut');
const copyTextBtn = document.getElementById('copyTextBtn');

let currentDataUrl = null;
let imgObj = null;

// Crop variables (user draws rectangle on canvas)
let cropping = false;
let cropStart = null;
let cropEnd = null;

// Create a new worker
const worker = new Worker('worker.js');

// Listen for messages from the worker
worker.onmessage = function(event) {
  const result = event.data;
  if (result.type === 'progress') {
    progress.textContent = result.message;
    if (result.progress !== undefined) {
      progressFill.style.width = `${Math.round(result.progress * 100)}%`;
    }
  } else if (result.type === 'result') {
    rawOut.value = JSON.stringify(result.raw, null, 2);
    textOut.value = result.text;
    progress.textContent = 'Done';
    runOcrBtn.disabled = false;
  } else if (result.type === 'error') {
    progress.textContent = result.message;
    runOcrBtn.disabled = false;
  }
};

// Function to clear the canvas background
function clearCanvasBackground() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Function to draw the image on the canvas
function drawImageOnCanvas() {
  if (!imgObj) { clearCanvasBackground(); return; }
  // draw the image fit to canvas
  ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);

  // draw crop rectangle
  if (cropStart && cropEnd) {
    const [x, y, w, h] = getCropRect();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,0,0,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

// Function to get the crop rectangle
function getCropRect() {
  if (!cropStart || !cropEnd) return null;
  const x = Math.min(cropStart.x, cropEnd.x);
  const y = Math.min(cropStart.y, cropEnd.y);
  const w = Math.abs(cropStart.x - cropEnd.x);
  const h = Math.abs(cropStart.y - cropEnd.y);
  return [x, y, w, h];
}

// Mouse handlers for cropping
canvas.addEventListener('mousedown', (e) => {
  if (!imgObj) return;
  cropping = true;
  cropStart = { x: e.offsetX, y: e.offsetY };
  cropEnd = null;
});
canvas.addEventListener('mousemove', (e) => {
  if (!cropping) return;
  cropEnd = { x: e.offsetX, y: e.offsetY };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawImageOnCanvas();
});
canvas.addEventListener('mouseup', (e) => {
  if (!imgObj) return;
  cropping = false;
  cropEnd = { x: e.offsetX, y: e.offsetY };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawImageOnCanvas();
});

// File input: read as data URL & display scaled to fit
imageInput.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentDataUrl = reader.result;
    imgObj = new Image();
    imgObj.onload = () => {
      // fit image into canvas (keep aspect ratio)
      const maxW = 1000;
      const maxH = 600;
      let w = imgObj.naturalWidth;
      let h = imgObj.naturalHeight;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawImageOnCanvas();
      runOcrBtn.disabled = false;
      removeBtn.disabled = false;
      // IMPORTANT: keep original data URL (currentDataUrl) for passing to pipeline
    };
    imgObj.crossOrigin = 'anonymous';
    imgObj.src = currentDataUrl;
  };
  reader.readAsDataURL(f);
});

// Sample screenshot (use a multi-line sample)
sampleBtn.addEventListener('click', () => {
  // small sample screenshot (replaceable)
  const url = 'https://raw.githubusercontent.com/Xenova/transformers.js/main/assets/invoice.png'; // documents sample
  imgObj = new Image();
  imgObj.crossOrigin = 'anonymous';
  imgObj.onload = () => {
    currentDataUrl = url;
    // fit size
    const maxW = 1000, maxH = 600;
    let w = imgObj.naturalWidth, h = imgObj.naturalHeight;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImageOnCanvas();
    runOcrBtn.disabled = false;
    removeBtn.disabled = false;
  };
  imgObj.src = url;
});

// Remove image
removeBtn.addEventListener('click', () => {
  currentDataUrl = null;
  imgObj = null;
  cropStart = cropEnd = null;
  clearCanvasBackground();
  runOcrBtn.disabled = true;
  removeBtn.disabled = true;
  rawOut.value = '';
  textOut.value = '';
});

// Load model button (chooses pipeline automatically)
loadBtn.addEventListener('click', async () => {
  const modelId = modelSelect.value;
  loadBtn.disabled = true;
  progress.textContent = `Loading model "${modelId}" — this may be large.`;
  progressBar.style.display = 'inline-block';
  progressFill.style.width = '0%';

  worker.postMessage({ type: 'loadModel', modelId: modelId });
});

// Run OCR button
function runOcr() {
  if (!currentDataUrl) {
    alert('Upload or load an image first');
    return;
  }

  document.getElementById('progress').textContent = 'Running OCR...';
  runOcrBtn.disabled = true;

  // Build input — if the user selected a crop, crop canvas -> use that dataURL
  let inputDataUrl;
  const cropRect = getCropRect();
  if (cropRect && cropRect[2] > 4 && cropRect[3] > 4) {
    // create temporary canvas with the cropped region
    const [x, y, w, h] = cropRect;
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(w));
    tmp.height = Math.max(1, Math.round(h));
    const tctx = tmp.getContext('2d');
    // draw the corresponding region from displayed canvas into tmp
    tctx.drawImage(canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    inputDataUrl = tmp.toDataURL('image/png');
  } else {
    // no crop: use original data URL or canvas capture
    // prefer currentDataUrl if it's a proper URL or data URL; otherwise take canvas snapshot
    if (typeof currentDataUrl === 'string' && (currentDataUrl.startsWith('data:') || currentDataUrl.startsWith('http'))) {
      inputDataUrl = currentDataUrl;
    } else {
      inputDataUrl = canvas.toDataURL('image/png');
    }
  }

  worker.postMessage({ type: 'runOcr', inputDataUrl: inputDataUrl });
}

// Attach event listener to the Run OCR button
document.getElementById('runOcrBtn').addEventListener('click', runOcr);

// Copy Text button
copyTextBtn.addEventListener('click', () => {
  const text = textOut.value;
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      progress.textContent = 'Text copied to clipboard!';
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      progress.textContent = 'Failed to copy text to clipboard.';
    });
  } else {
    progress.textContent = 'No text to copy.';
  }
});

// Initialize canvas background
clearCanvasBackground();
