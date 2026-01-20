// ================= ELEMENTS =================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const messageEl = document.getElementById("message");
const accuracyEl = document.getElementById("accuracy");

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

// ================= ACCURACY FUNCTION =================
function calculateAccuracy(backAngle, legAngle) {
  const idealBack = 90;
  const idealLeg = 165;

  const backDiff = Math.abs(backAngle - idealBack);
  const legDiff = Math.abs(legAngle - idealLeg);

  let score = 100 - (backDiff * 1.5 + legDiff * 1.2);
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
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
    return;
  }

  // -------- Skeleton Overlay --------
  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00ff99",
    lineWidth: 3,
  });

  drawLandmarks(ctx, results.poseLandmarks, {
    color: "#ffffff",
    radius: 4,
  });

  const lm = results.poseLandmarks;

  // LEFT SIDE landmarks (Ardha Halasana)
  const shoulder = lm[11];
  const hip = lm[23];
  const knee = lm[25];
  const ankle = lm[27];

  const backAngle = calculateAngle(shoulder, hip, knee);
  const legAngle = calculateAngle(hip, knee, ankle);

  // -------- Draw Angles on Video --------
  ctx.fillStyle = "#ff0000";
  ctx.font = "22px Arial";
  ctx.fillText(`Back Angle: ${Math.round(backAngle)}°`, 15, 25);
  ctx.fillText(`Leg Angle: ${Math.round(legAngle)}°`, 15, 45);

  // -------- Accuracy --------
  const accuracy = calculateAccuracy(backAngle, legAngle);
  accuracyEl.innerText = accuracy;

  // -------- Pose Validation --------
  const isCorrect =
    backAngle >= 80 && backAngle <= 100 &&
    legAngle >= 150 && legAngle <= 180;

  if (isCorrect && accuracy >= 85) {
    messageEl.innerText = "Excellent! Hold the pose.";
    messageEl.style.color = "#00ff99";
  } else {
    messageEl.innerText = "Adjust your posture";
    messageEl.style.color = "#ff6666";
  }
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
