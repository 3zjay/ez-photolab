import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { getLandmarker, detectSkinRegions } from './faceRestore';

export async function initFaceLandmarker() {
  return getLandmarker();
}

function drawConnections(ctx, landmarks, connections, width, height) {
  if (!landmarks || !connections || connections.length === 0) return;
  
  const indices = new Set();
  connections.forEach(conn => {
    indices.add(conn.start);
    indices.add(conn.end);
  });

  const pts = Array.from(indices).map(idx => landmarks[idx]).filter(Boolean);
  if (pts.length < 3) return;

  // Compute centroid
  let cx = 0, cy = 0;
  pts.forEach(p => { cx += p.x; cy += p.y; });
  cx /= pts.length;
  cy /= pts.length;

  // Sort points by polar angle around centroid to form a continuous polygon boundary
  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

  ctx.beginPath();
  ctx.moveTo(pts[0].x * width, pts[0].y * height);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * width, pts[i].y * height);
  }
  ctx.closePath();
  ctx.fill();
}

function buildSkinFallbackMask(sourceCanvas) {
  const { mask, skinCount, W, H } = detectSkinRegions(sourceCanvas);
  if (skinCount < (W * H * 0.005)) return null;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = W;
  maskCanvas.height = H;
  const ctx = maskCanvas.getContext('2d');
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      const idx = i * 4;
      d[idx] = 255;
      d[idx + 1] = 255;
      d[idx + 2] = 255;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = W;
  blurredCanvas.height = H;
  const bCtx = blurredCanvas.getContext('2d');
  const blurRadius = Math.max(3, Math.round(W * 0.015));
  bCtx.filter = `blur(${blurRadius}px)`;
  bCtx.drawImage(maskCanvas, 0, 0);
  bCtx.filter = 'none';
  return blurredCanvas;
}

export async function createSkinMask(sourceCanvas) {
  try {
    const faceLandmarker = await Promise.race([
      getLandmarker(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
    ]);
    
    if (faceLandmarker) {
      const results = faceLandmarker.detect(sourceCanvas);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = sourceCanvas.width;
        maskCanvas.height = sourceCanvas.height;
        const ctx = maskCanvas.getContext('2d');
        
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        results.faceLandmarks.forEach(landmarks => {
          ctx.fillStyle = "white";
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, maskCanvas.width, maskCanvas.height);
          
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "black";
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, maskCanvas.width, maskCanvas.height);
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, maskCanvas.width, maskCanvas.height);
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, maskCanvas.width, maskCanvas.height);
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, maskCanvas.width, maskCanvas.height);
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, maskCanvas.width, maskCanvas.height);
          ctx.globalCompositeOperation = "source-over";
        });
        
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
    }
  } catch (e) {
    console.warn("createSkinMask fallback to color-space skin segmentation:", e);
  }
  
  return buildSkinFallbackMask(sourceCanvas);
}

export async function createFaceOvalMask(sourceCanvas) {
  try {
    const faceLandmarker = await Promise.race([
      getLandmarker(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
    ]);
    
    if (faceLandmarker) {
      const results = faceLandmarker.detect(sourceCanvas);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = sourceCanvas.width;
        maskCanvas.height = sourceCanvas.height;
        const ctx = maskCanvas.getContext('2d');
        
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        results.faceLandmarks.forEach(landmarks => {
          ctx.fillStyle = "white";
          drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, maskCanvas.width, maskCanvas.height);
        });
        
        const blurredCanvas = document.createElement('canvas');
        blurredCanvas.width = maskCanvas.width;
        blurredCanvas.height = maskCanvas.height;
        const bCtx = blurredCanvas.getContext('2d');
        const blurRadius = Math.max(4, Math.round(maskCanvas.width * 0.025));
        bCtx.filter = `blur(${blurRadius}px)`;
        bCtx.drawImage(maskCanvas, 0, 0);
        bCtx.filter = 'none';
        return blurredCanvas;
      }
    }
  } catch (e) {
    console.warn("createFaceOvalMask fallback to skin segmentation:", e);
  }
  
  return buildSkinFallbackMask(sourceCanvas);
}

