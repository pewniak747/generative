const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// GLOBALS

const segmentLengthPx = 50;
const directions = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

class MultiSet {
  constructor() {
    this.set = {};
  }

  add(key) {
    if (this.has(key)) {
      this.set[key] += 1;
    }
    else {
      this.set[key] = 1;
    }
  }

  count(key) {
    return this.set[key] || 0;
  }

  has(key) {
    return this.set.hasOwnProperty(key);
  }
}

function pointsEqual(p1, p2) {
  return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
}

const takenPointsCache = new MultiSet();

class Branch {
  constructor({ startingPoint }) {
    this.segments = [];
    this.startingPoint = startingPoint;
    this.growthPoint = startingPoint;
    this.fullPathSegment = [];
    this.endpoints = [];
    this.maxPathLength = null;
    this.segmentsBack = 1;
    this.pathLength = 0;
    this.growthEnded = false;
  }

  grow() {
    if (this.growthEnded) return;

    this.maxPathLength = 50 + this.segments.length / 50;
    let hasGrown = false;

    while(!hasGrown) {
      if (this.growthEnded) return;

      if (this.segments.length) {
        this.growthPoint = this.segments[this.segments.length - 1][1];
      }

      hasGrown = true;
      if (this.pathLength > this.maxPathLength) {
        hasGrown = false;
        // console.log("NOT GROWING -- path at max length")
      }
      if (hasGrown) {
        const mod = Math.abs(this.growthPoint[0] + this.growthPoint[1] + this.growthPoint[2]) % 2;
        const eligibleDirections = directions.filter((d, idx) => idx % 2 === mod);
        const eligibleSegmentsWithWeights = eligibleDirections
          .map(d => [d, this.directionWeight(this.growthPoint, d)])
          .map(([d, weight]) => [this.generateSegment(d, this.growthPoint), weight])
          .filter(([s, weight]) => !this.isPointTaken(s[1]))
        if (eligibleSegmentsWithWeights.length > 0) {
          const segment = this.chooseWeighted(eligibleSegmentsWithWeights);
          // this.segmentsBack = 1;
          this.pathLength++;
          this.segments.push(segment);
          this.fullPathSegment.push(true);
          takenPointsCache.add(segment[0].toString());
          takenPointsCache.add(segment[1].toString());
        } else {
          hasGrown = false;
          // console.log("NOT GROWING -- no eligible candidates");
        }
      }

      if(!hasGrown) {
        this.growthEnded = true;
      }
    }

    if (this.segments.length % 25 === 0) {
      console.info("Growing", this.segments.length, "segments");
    }
  };

  isPointTaken(point) {
    return takenPointsCache.has(point.toString());
  }

  generateSegment(direction, point) {
    const start = point;
    const end = [start[0] + direction[0], start[1] + direction[1], start[2] + direction[2]];
    return [start, end];
  }

  directionWeight(point, direction) {
    // return Math.random();
    // const normalizedPoint = point.map((p, idx) => p - this.startingPoint[idx]);
    return point.map((p, idx) => [p, direction[idx]]).map(([x1, x2]) => Math.sign(x1) !== Math.sign(x2) ? 2 * Math.abs(x1) : Math.abs(x1) / 2.0).reduce((e, acc = 0) => e + acc);
  }

  chooseUniform(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  chooseWeighted(choicesWeights) {
    // normalize weights
    const sumWeights = choicesWeights.map(([c, weight]) => weight).reduce((e, acc = 0) => e + acc);
    if (sumWeights === 0) {
      return this.chooseUniform(choicesWeights)[0];
    }

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

}

// DRAWING

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
  ctx.moveTo(startX * segmentLengthPx, startY * segmentLengthPx);
  ctx.lineTo(endX * segmentLengthPx, endY * segmentLengthPx);
  ctx.globalAlpha = 0.05;
  ctx.stroke();
  ctx.restore();
  drawPoint(start);
  drawPoint(end);
};

function drawPoint(point) {
  const [x, y] = hexTo2d(point);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.arc(x * segmentLengthPx, y * segmentLengthPx, segmentLengthPx / 20, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

function drawBranch(branch) {
  branch.segments.forEach((segment, idx) => drawSegment(segment, idx));
};

function drawPath(path) {
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.moveTo(...path[0]);
  ctx.strokeStyle = 'black';
  ctx.lineCap = 'round';
  for(let i = 1; i < path.length; i++) {
    ctx.beginPath();
    ctx.lineTo(...path[i]);
    ctx.lineWidth = Math.max(1, 20 * (1 - Math.min(20, i / 100) / 20));
    // ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
};

function drawTargets(targets) {
  // for (let target of targets) {
    const [x, y] = targets[targets.length - 1];
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.beginPath();
    ctx.arc(x, y, segmentLengthPx / 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'red';
    // ctx.globalAlpha = 0.15;
    // ctx.fill();
    ctx.stroke();
    // ctx.endPath();
    ctx.restore();
  // }
};

function draw() {
  // reset canvas
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const pathEnded = branches.every(b => b.pathEnded);
  if (!pathEnded) {
    branches.forEach(b => drawBranch(b));
  }
  branches.forEach(b => drawPath(b.path));
  if (!pathEnded) {
    drawTargets(targets2D);
  }
}

adjustCanvasSize();
window.addEventListener('resize', () => {
  adjustCanvasSize();
  draw();
});

// const branch = new Branch({ startingPoint: [0, 0, 0] });
const branches = [
  new Branch({ startingPoint: [0, 0, 0] }),
  new Branch({ startingPoint: [0, 0, 0] }),
  new Branch({ startingPoint: [0, 0, 0] }),
];
branches.forEach(branch => branch.path = [hexTo2d(branch.startingPoint).map(d => d * segmentLengthPx)]);
let targets2D = [];

function grow() {
  branches.forEach(b => b.grow());
};

function growPath() {
  branches.forEach((branch) => {
    const targetIdx = Math.ceil(branch.path.length / segmentLengthPx);
    if (targetIdx > branch.segments.length) {
      branch.pathEnded = true;
      return;
    }

    const targets = branch.segments.map(s => hexTo2d(s[1]));
    let targetsWeights = targets.map((t, idx) => idx - branch.path.length / (segmentLengthPx * 0.80)).map(w => w >= 0 && w < 3 ? 1.5 - Math.abs(w - 1.5) : 0);
    const targetsWeightsSum = targetsWeights.reduce((w, acc = 0) => w + acc);
    targetsWeights = targetsWeights.map(t => t / targetsWeightsSum);
    const target2D = targets.map((t, idx) => [t[0] * targetsWeights[idx] * segmentLengthPx, t[1] * targetsWeights[idx] * segmentLengthPx]).reduce((t, acc = [0, 0]) => [acc[0] + t[0], acc[1] + t[1]]);
    const end = branch.path[branch.path.length - 1];
    const directionVec = [target2D[0] - end[0], target2D[1] - end[1]];
    const vecLength = Math.sqrt(Math.pow(directionVec[0], 2) + Math.pow(directionVec[1], 2));
    const normalizedVec = [directionVec[0] / vecLength, directionVec[1] / vecLength];
    const next = [end[0] + normalizedVec[0], end[1] + normalizedVec[1]];
    branch.path.push(next);
    targets2D.push(target2D);
  });
}

for (let i = 0; i < 40; i++) grow();

setInterval(growPath, 10);
setInterval(draw, 50);
