// ================= ELEMENTS =================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const messageEl = document.getElementById("message");
const accuracyEl = document.getElementById("accuracy");

// ================= SMOOTHING & HOLD =================
let backBuffer = [];
let legBuffer = [];
const BUFFER_SIZE = 6;

let correctStartTime = null;
const HOLD_TIME_MS = 2000;

// ================= CANVAS RESIZE =================
function resizeCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// ================= ANGLE FUNCTION =================
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ================= SMOOTHING =================
function smoothValue(buffer, val) {
  if (!val || isNaN(val)) return 0;

  buffer.push(val);
  if (buffer.length > BUFFER_SIZE) buffer.shift();

  return buffer.reduce((a, b) => a + b, 0) / buffer.length;
}

// ================= ACCURACY =================
function calculateAccuracy(backAngle, legAngle) {
  const idealBack = 90;
  const idealLeg = 165;

  const backDiff = Math.abs(backAngle - idealBack);
  const legDiff = Math.abs(legAngle - idealLeg);

  let score = 100 - (backDiff * 1.2 + legDiff * 1.0);
  score = Math.max(0, Math.min(100, score));
  return score;
}

// ================= VOICE =================
let lastSpokenText = "";
let lastSpokenTime = 0;
const VOICE_COOLDOWN_MS = 4000;

function speak(text) {
  const now = Date.now();
  if (!text) return;
  if (text === lastSpokenText) return;
  if (now - lastSpokenTime < VOICE_COOLDOWN_MS) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;

  speechSynthesis.speak(utterance);
  lastSpokenText = text;
  lastSpokenTime = now;
}

// ================= MEDIAPIPE =================
const pose = new Pose({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// ================= RESULTS =================
pose.onResults(results => {
  if (!video.videoWidth) return;

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) {
    messageEl.innerText = "No pose detected";
    accuracyEl.innerText = "0";
    correctStartTime = null;
    return;
  }

  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00ff99",
    lineWidth: 3,
  });

  drawLandmarks(ctx, results.poseLandmarks, {
    color: "#ffffff",
    radius: 4,
  });

  const lm = results.poseLandmarks;
  const shoulder = lm[11];
  const hip = lm[23];
  const knee = lm[25];
  const ankle = lm[27];

  const rawBack = calculateAngle(shoulder, hip, knee);
  const rawLeg = calculateAngle(hip, knee, ankle);

  const backAngle = smoothValue(backBuffer, rawBack);
  const legAngle = smoothValue(legBuffer, rawLeg);

  ctx.fillStyle = "#ffff00";
  ctx.font = "16px Arial";
  ctx.fillText(`Back Angle: ${Math.round(backAngle)}°`, 15, 25);
  ctx.fillText(`Leg Angle: ${Math.round(legAngle)}°`, 15, 45);

  let accuracy = calculateAccuracy(backAngle, legAngle);

  const isBackCorrect = backAngle >= 80 && backAngle <= 100;
  const isLegCorrect = legAngle >= 150 && legAngle <= 180;

  // HOLD LOGIC
  if (isBackCorrect && isLegCorrect) {
    if (!correctStartTime) correctStartTime = Date.now();
    if (Date.now() - correctStartTime >= HOLD_TIME_MS) {
      accuracy = 100;
    }
  } else {
    correctStartTime = null;
  }

  accuracyEl.innerText = Math.round(accuracy);

  let feedbackText = "";

  if (accuracy === 100) {
    feedbackText = "Excellent. Hold the posture.";
    messageEl.style.color = "#00ff99";
  } else if (!isBackCorrect) {
    feedbackText =
      backAngle < 80
        ? "Lower your legs slightly."
        : "Raise your legs higher.";
    messageEl.style.color = "#ff6666";
  } else if (!isLegCorrect) {
    feedbackText = "Straighten your knees.";
    messageEl.style.color = "#ff6666";
  }

  messageEl.innerText = feedbackText;
  speak(feedbackText);
});

// ================= CAMERA =================
const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 640,
  height: 480,
});

camera.start();
