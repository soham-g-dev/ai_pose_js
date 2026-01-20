const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const messageEl = document.getElementById("message");
const accuracyEl = document.getElementById("accuracy");

canvas.width = 480;
canvas.height = 360;

// ---------- ANGLE FUNCTION (SAME LOGIC) ----------
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ---------- MEDIAPIPE ----------
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

pose.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) return;

  const lm = results.poseLandmarks;

  const shoulder = lm[11];
  const hip = lm[23];
  const knee = lm[25];
  const ankle = lm[27];

  const backAngle = calculateAngle(shoulder, hip, knee);
  const legAngle = calculateAngle(hip, knee, ankle);

  // ---------- SAME ARDHA HALASANA LOGIC ----------
  const isCorrect =
    backAngle >= 80 && backAngle <= 100 &&
    legAngle >= 150 && legAngle <= 180;

  if (isCorrect) {
    messageEl.innerText = "Excellent. Hold the pose.";
    accuracyEl.innerText = "100";
  } else {
    messageEl.innerText = "Adjust your posture";
    accuracyEl.innerText = "70";
  }
});

// ---------- CAMERA ----------
const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 480,
  height: 360,
});

camera.start();
