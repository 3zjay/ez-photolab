import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker = null;

export async function initFaceLandmarker() {
  if (faceLandmarker) return;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: false,
      runningMode: "IMAGE",
      numFaces: 5
    });
  } catch (e) {
    console.warn("Failed to init FaceLandmarker with GPU, trying CPU fallback...", e);
    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
        numFaces: 5
      });
    } catch (err) {
      console.error("Failed to init FaceLandmarker on CPU:", err);
      throw err;
    }
  }
}

function drawConnections(ctx, landmarks, connections, width, height) {
  if (!landmarks || !connections || connections.length === 0) return;
  
  ctx.beginPath();
  let lastEnd = -1;
  connections.forEach(({start, end}) => {
    const ptStart = landmarks[start];
    const ptEnd = landmarks[end];
    if (!ptStart || !ptEnd) return;
    if (start !== lastEnd) {
      ctx.moveTo(ptStart.x * width, ptStart.y * height);
    }
    ctx.lineTo(ptEnd.x * width, ptEnd.y * height);
    lastEnd = end;
  });
  ctx.closePath();
  ctx.fill();
}

export async function createSkinMask(sourceCanvas) {
  if (!faceLandmarker) await initFaceLandmarker();
  
  const results = faceLandmarker.detect(sourceCanvas);
  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    return null; // No face found
  }
  
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = sourceCanvas.width;
  maskCanvas.height = sourceCanvas.height;
  const ctx = maskCanvas.getContext('2d');
  
  // Fill transparent (no mask)
  ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  
  // Draw each face
  results.faceLandmarks.forEach(landmarks => {
    // 1. Draw the face oval in white (this includes everything)
    ctx.fillStyle = "white";
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, maskCanvas.width, maskCanvas.height);
    
    // 2. Cut out the eyes, eyebrows, and lips using destination-out
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "black";
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, maskCanvas.width, maskCanvas.height);
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, maskCanvas.width, maskCanvas.height);
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, maskCanvas.width, maskCanvas.height);
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, maskCanvas.width, maskCanvas.height);
    drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, maskCanvas.width, maskCanvas.height);
    ctx.globalCompositeOperation = "source-over";
  });
  
  // Apply a blur to soften the mask edges so the transition looks natural
  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = maskCanvas.width;
  blurredCanvas.height = maskCanvas.height;
  const bCtx = blurredCanvas.getContext('2d');
  
  const blurRadius = Math.max(2, Math.round(maskCanvas.width * 0.015));
  bCtx.filter = `blur(${blurRadius}px)`;
  bCtx.drawImage(maskCanvas, 0, 0);
  bCtx.filter = 'none';
  
  return blurredCanvas;
}
