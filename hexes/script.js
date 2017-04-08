const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const segmentLength = 5;
const bound = 10;
const maxPathLength = 100;
const segments = [
  [[0, 0, 0], [0, 1, 0]],
];
const fullPathSegment = [true];
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

const takenPointsCache = new Set();

function pointsEqual(p1, p2) {
  return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
}

function isSegmentTouching(segment) {
  //return false;

  //return !takenPointsCache.has(segment[0].toString()) || !takenPointsCache
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

function directionWeight(point, direction) {
  // return Math.random();
  return point.map((p, idx) => [p, direction[idx]]).map(([x1, x2]) => Math.sign(x1) === Math.sign(x2) ? 1 : 0.1).reduce((e, acc = 0) => e + acc);
}

function chooseUniform(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

function chooseWeighted(choicesWeights) {
  // normalize weights
  const sumWeights = choicesWeights.map(([c, weight]) => weight).reduce((e, acc = 0) => e + acc);
  const normalized = choicesWeights.map(([c, weight]) => [c, weight / sumWeights]);

  // select based on weights
  const randomSelection = Math.random();
  let runningSum = 0;
  for (const [choice, weight] of normalized) {
    runningSum += weight;
    if (randomSelection <= runningSum) {
      return choice;
    }
  }

  // should not end up there
  console.error("Did not select any choice!");
}

function grow() {
  const parentSegment = segments[segments.length - segmentsBack];
  const mod = Math.abs(parentSegment[1][0] + parentSegment[1][1] + parentSegment[1][2]) % 2;
  const eligibleDirections = directions.filter((d, idx) => idx % 2 === mod);
  const eligibleSegmentsWithWeights = eligibleDirections
    .map(d => [d, directionWeight(parentSegment[1], d)])
    .map(([d, weight]) => [generateSegment(d, parentSegment), weight])
    .filter(([s, weight]) => !isSegmentTouching(s))
    .filter(([s, weight]) => isSegmentInBounds(s));
  if (eligibleSegmentsWithWeights.length > 0 && pathLength < maxPathLength && fullPathSegment[segments.length - segmentsBack]) {
    // const segment = chooseUniform(eligibleSegmentsWithWeights.map(([s, weigtht]) => s));
    const segment = chooseWeighted(eligibleSegmentsWithWeights);
    segmentsBack = 1;
    pathLength++;
    segments.push(segment);
    fullPathSegment.push(true);
  } else {
    if (pathLength >= maxPathLength) {
      endpoints.push(parentSegment[1]);
      segmentsBack = segments.length;
    }
    else {
      if (pathLength === 0) {
        segmentsBack--;
      } else {
        // segments.splice(-pathLength, pathLength);
        fullPathSegment.fill(false, -pathLength)
        segmentsBack = segments.length;
      }
    }
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
  // ctx.globalAlpha = Math.max(1 - segment[1].reduce((e, acc = 0) => acc + Math.abs(e)) / 200, 0);
  /*
  if (idx === segments.length - 1) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
  }
  */
  if (!fullPathSegment[idx]) {
    ctx.globalAlpha = 0.33;
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
for(let i = 0; i < 10000; i++) grow();
setInterval(grow, 10);
draw();
