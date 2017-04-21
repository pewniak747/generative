const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// GLOBALS

const segmentLengthPx = 20;
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
    this.maxPathLength = 25;
    this.pathLength = 0;
    this.growthEnded = false;
  }

  grow() {
    if (this.growthEnded) return;

    // this.maxPathLength = 45 + this.segments.length / 50;
    let hasGrown = false;

    while(!hasGrown) {
      if (this.growthEnded) return;

      if (this.segments.length) {
        this.growthPoint = this.segments[this.segments.length - 1][1];
      }

      hasGrown = true;
      if (this.pathLength > this.maxPathLength) {
        console.log("NOT GROWING -- path at max length")
        hasGrown = false;
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
          this.pathLength++;
          this.segments.push(segment);
          this.fullPathSegment.push(true);
          takenPointsCache.add(segment[0].toString());
          takenPointsCache.add(segment[1].toString());
        } else {
          console.log("NOT GROWING -- no eligible candidates");
          hasGrown = false;
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
    return point.map((p, idx) => [p, direction[idx]]).map(([x1, x2]) => Math.sign(x2) === -1 ? 2 : 0.05).reduce((e, acc = 0) => e + acc);
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
  ctx.globalAlpha = 0.15;
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

function basePointIdxFor(branch) {
  if (!branch.origin) return 0;

  return branch.origin.pointsBack + basePointIdxFor(branch.origin.branch);
}

function branchWidthAt(pointIdx) {
  const maxWidth = segmentLengthPx / 1.5;
  const minWidth = segmentLengthPx / 9;
  const branchLength = 20;
  return Math.max(minWidth, maxWidth - Math.min(maxWidth, pointIdx / branchLength));
}

function drawPath(branch) {
  const path = branch.path;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.moveTo(...path[0]);
  ctx.strokeStyle = 'black';
  ctx.lineCap = 'round';
  const basePointIdx = basePointIdxFor(branch);
  for(let i = 1; i < path.length; i++) {
    ctx.beginPath();
    ctx.lineTo(...path[i]);
    ctx.lineWidth = branchWidthAt(i + basePointIdx);
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
  branches.forEach(b => b.path && b.segments.length > 3 ? drawPath(b) : null);
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
const gap = 30;
const branches = [
  /*
  new Branch({ startingPoint: [0, -gap, 0] }),
  new Branch({ startingPoint: [0, -gap, 0] }),
  new Branch({ startingPoint: [0, -gap, 0] }),
  new Branch({ startingPoint: [0, gap, 0] }),
  new Branch({ startingPoint: [gap, 0, 0] }),
  new Branch({ startingPoint: [-gap, 0, 0] }),
  new Branch({ startingPoint: [0, 0, gap] }),
  new Branch({ startingPoint: [0, 0, -gap] }),
  */
  new Branch({ startingPoint: [0, 6, 0] }),
];
branches.forEach(branch => branch.path = [hexTo2d(branch.startingPoint).map(d => d * segmentLengthPx)]);
let targets2D = [];

function grow() {
  branches.forEach(b => b.grow());
  const lastBranch = branches[branches.length - 1];
  if (branches.every(b => b.growthEnded)) {
    console.log("Branch growth ended -- seeking new branch start");
    let candidateFound = false;
    // while(!candidateFound) {
      for (const originBranch of branches) {
        let segmentsBack = 2;
        while(!candidateFound) {
          if (segmentsBack >= originBranch.segments.length) break;
          const candidateBranch = new Branch({ startingPoint: originBranch.segments[segmentsBack][0] });
          candidateBranch.grow();
          if (!candidateBranch.growthEnded) {
            candidateBranch.origin = {
              branch: originBranch,
              segmentsBack,
            };
            candidateBranch.maxPathLength = (originBranch.segments.length - segmentsBack) * 0.5;
            branches.push(candidateBranch);
            candidateFound = true;
            break;
          }
          if (!candidateFound) {
            segmentsBack++;
          }
        }
      }
    //}
  }
};

function distance2d([x1, y1], [x2, y2]) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function growPath() {
  for (const branch of branches) {
    // find starting point
    if (!branch.path) {
      const branchOrigin = hexTo2d(branch.startingPoint).map(d => d * segmentLengthPx);
      const originPointsWithDistances = branch.origin.branch.path.map(p => [p, distance2d(p, branchOrigin)]);
      let minDistanceIdx = 0;
      originPointsWithDistances.forEach(([point, distance], idx) => {
        if (!distance && distance !== 0) return;
        if (distance < originPointsWithDistances[minDistanceIdx][1]) {
          minDistanceIdx = idx;
        }
      });
      const pathStartingPoint = originPointsWithDistances[minDistanceIdx][0];
      branch.path = [pathStartingPoint];
      branch.origin.pointsBack = minDistanceIdx;
    }

    const targetIdx = Math.ceil(branch.path.length / segmentLengthPx);
    if (targetIdx > branch.segments.length) {
      branch.pathEnded = true;
      continue;
    }

    const targets = branch.segments.map(s => hexTo2d(s[1]))
    targets.unshift(hexTo2d(branch.segments[0][0]));
    let targetsWeights = targets.map((t, idx) => idx - branch.path.length / (segmentLengthPx * 0.8)).map(w => w >= 0 && w < 3 ? 1.5 - Math.abs(w - 1.5) : 0);
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
    break; // grow one branch at a time
  };
}

// Grow branches
for (let i = 0; i < 200; i++) grow();

// Grow paths based on branches
for (let i = 0; i < 30000; i++) growPath();
// setInterval(growPath, 10);
// setInterval(draw, 50);
draw();
