const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const segmentLength = 10;
const bound = 10;
const maxPathLength = 1000;
const segments = [
  [[0, 0, 0], [0, 1, 0]],
];
const endpoints = [];
const directions = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
let segmentsBack = 1;
let pathLength = 1;

function pointsEqual(p1, p2) {
  return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
}

function isSegmentTouching(segment) {
  let touching = 0;
  for (drawnSegment of segments) {
    if (pointsEqual(drawnSegment[0], segment[0])) touching++;
    if (pointsEqual(drawnSegment[1], segment[1])) touching++;
    if (pointsEqual(drawnSegment[1], segment[0])) touching++;
    if (pointsEqual(drawnSegment[0], segment[1])) touching++;
    if (touching > 2) return true;
  }
  return false;
}

function isSegmentInBounds(segment) {
  return true;
  /*
  return (Math.abs(segment[0][0]) + Math.abs(segment[0][1]) + Math.abs(segment[0][2]) <= bound &&
          Math.abs(segment[1][0]) + Math.abs(segment[1][1]) + Math.abs(segment[1][2]) <= bound);
          */
  return (Math.abs(segment[0][0]) <= bound &&
          Math.abs(segment[0][1]) <= bound &&
          Math.abs(segment[0][2]) <= bound &&
          Math.abs(segment[1][0]) <= bound &&
          Math.abs(segment[1][1]) <= bound &&
          Math.abs(segment[1][2]) <= bound)
};

function generateSegment(direction, parentSegment) {
  const start = parentSegment[1];
  const end = [start[0] + direction[0], start[1] + direction[1], start[2] + direction[2]];
  return [start, end];
}

function grow() {
  const parentSegment = segments[segments.length - segmentsBack];
  const mod = Math.abs(parentSegment[1][0] + parentSegment[1][1] + parentSegment[1][2]) % 2;
  const eligibleDirections = directions.filter((d, idx) => idx % 2 === mod);
  const eligibleSegments = eligibleDirections.map(d => generateSegment(d, parentSegment)).filter(s => !isSegmentTouching(s)).filter(isSegmentInBounds);
  if (eligibleSegments.length > 0 && pathLength < maxPathLength) {
    const segment = eligibleSegments[Math.floor(Math.random() * eligibleSegments.length)];
    segmentsBack = 1;
    pathLength++;
    segments.push(segment);
  } else {
    if (segmentsBack === 1) {
      endpoints.push(parentSegment[1]);
      segmentsBack = segments.length;
    }
    else segmentsBack--;
    pathLength = 0;
    grow();
  }
};

function adjustCanvasSize() {
  const width = document.body.clientWidth;
  const height = document.body.clientHeight;
  canvas.width = width;
  canvas.height = height;
};

function hexTo2d([x, y, z]) {
  const dx = 1.2 * Math.SQRT1_2 * (x - z);
  const dy = y + 0.5 * x + 0.5 * z;
  return [dx, dy];
};

function drawSegment(segment, idx) {
  const [start, end] = segment;
  const [startX, startY] = hexTo2d(start);
  const [endX, endY] = hexTo2d(end);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.moveTo(startX * segmentLength, startY * segmentLength);
  ctx.lineTo(endX * segmentLength, endY * segmentLength);
  if (idx === segments.length - 1) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
  }
  ctx.stroke();
  ctx.restore();
};

function drawEndpoint(point) {
  const [x, y] = hexTo2d(point);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  ctx.beginPath();
  ctx.arc(x * segmentLength, y * segmentLength, segmentLength / 3, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

function draw() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  segments.forEach(drawSegment)
  endpoints.forEach(drawEndpoint);
  window.requestAnimationFrame(draw);
};

adjustCanvasSize();
window.addEventListener('resize', adjustCanvasSize);
/*
window.addEventListener('click', function() {
  grow();
});
*/
for(let i = 0; i < 1000; i++) grow();
setInterval(grow, 10);
draw();
