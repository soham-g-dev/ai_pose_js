// ================= DOM ELEMENTS =================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const messageEl = document.getElementById("message");
const accuracyEl = document.getElementById("accuracy");

canvas.width = 480;
canvas.height = 360;

// ================= ANGLE CALCULATION =================
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ================= ACCURACY LOGIC (PROFESSIONAL) =================
function calculateAccuracy(backAngle, legAngle) {
  const idealBack = 90;
  const idealLeg = 165;

  const backDiff = Math.abs(backAngle - idealBack);
  const legDiff = Math.abs(legAngle - idealLeg);

  // Weighted error penalty
  let score = 100 - (backDiff * 1.5 + legDiff * 1.2);

  // Clamp between 0–100
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

// ================= MEDIAPIPE POSE =================
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

// ================= POSE RESULTS =================
pose.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) {
    messageEl.innerText = "No pose detected";
    accuracyEl.innerText = "0";
    return;
  }

  const lm = results.poseLandmarks;

  // LEFT SIDE landmarks (same as Python logic)
  const shoulder = lm[11];
  const hip = lm[23];
  const knee = lm[25];
  const ankle = lm[27];

  const backAngle = calculateAngle(shoulder, hip, knee);
  const legAngle = calculateAngle(hip, knee, ankle);

  // ================= ARDHA HALASANA RULE =================
  const isCorrect =
    backAngle >= 80 && backAngle <= 100 &&
    legAngle >= 150 && legAngle <= 180;

  // ================= ACCURACY =================
  const accuracy = calculateAccuracy(backAngle, legAngle);
  accuracyEl.innerText = accuracy;

  // ================= FEEDBACK =================
  if (isCorrect && accuracy >= 85) {
    messageEl.innerText = "Excellent. Hold the pose.";
    messageEl.style.color = "#00ff99";
  } else {
    messageEl.innerText = "Adjust your posture";
    messageEl.style.color = "#ff5555";
  }

  // ================= OPTIONAL VISUAL DEBUG =================
  ctx.fillStyle = "yellow";
  ctx.font = "14px Arial";
  ctx.fillText(`Back: ${Math.round(backAngle)}°`, 20, 30);
  ctx.fillText(`Leg: ${Math.round(legAngle)}°`, 20, 50);
});

// ================= CAMERA =================
const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 480,
  height: 360,
});

camera.start();
