const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// GLOBALS

const segmentLengthPx = 2;
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

class Shape {
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

    this.maxPathLength = 10 + this.segments.length / 50;
    let hasGrown = false;

    while(!hasGrown) {
      if (this.growthEnded) return;

      if (this.segments.length) {
        this.growthPoint = this.segments[this.segments.length - this.segmentsBack][1];
      }

      hasGrown = true;
      if (this.pathLength > this.maxPathLength) {
        hasGrown = false;
        // console.log("NOT GROWING -- path at max length")
      }
      if (this.segments.length && !this.fullPathSegment[this.segments.length - this.segmentsBack]) {
        hasGrown = false;
        // console.log("NOT GROWING -- not a full path segment")
      }
      if (takenPointsCache.count(this.growthPoint) === 3) {
        hasGrown = false;
        // console.log("NOT GROWING -- fully taken point")
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
          this.segmentsBack = 1;
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
        if (this.pathLength >= this.maxPathLength) {
          this.endpoints.push(this.growthPoint);
          this.segmentsBack = this.segments.length;
        }
        else {
          if (this.pathLength === 0) {
            if (this.segmentsBack > 1) {
              this.segmentsBack--;
              // console.log("going back...", this.segmentsBack);
            }
            else {
              this.growthEnded = true;
            }
          } else {
            this.fullPathSegment.fill(false, -this.pathLength)
            this.segmentsBack = this.segments.length;
          }
        }
        this.pathLength = 0;
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

function drawSegment(segment, idx, shape) {
  const [start, end] = segment;
  const [startX, startY] = hexTo2d(start);
  const [endX, endY] = hexTo2d(end);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.moveTo(startX * segmentLengthPx, startY * segmentLengthPx);
  ctx.lineTo(endX * segmentLengthPx, endY * segmentLengthPx);
  if (!shape.fullPathSegment[idx]) {
    ctx.globalAlpha = 0.15;
  }
  ctx.stroke();
  ctx.restore();
};

function drawEndpoint(point) {
  const [x, y] = hexTo2d(point);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.arc(x * segmentLengthPx, y * segmentLengthPx, segmentLengthPx / 4, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

function drawStartpoint(point) {
  const [x, y] = hexTo2d(point);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.arc(x * segmentLengthPx, y * segmentLengthPx, segmentLengthPx, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

function draw(shapes) {
  console.info("DRAWING");
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  shapes.forEach((shape) => {
    shape.segments.forEach((segment, idx) => drawSegment(segment, idx, shape));
    shape.endpoints.forEach(drawEndpoint);
    drawStartpoint(shape.startingPoint);
  })
};

adjustCanvasSize();
window.addEventListener('resize', () => {
  adjustCanvasSize();
  draw(shapes);
});

const gap = 33 * 3;

const shapes = [
  new Shape({ startingPoint: [-gap, 0, 0] }),
  new Shape({ startingPoint: [gap, 0, 0] }),
  new Shape({ startingPoint: [0, -gap, 0] }),
  new Shape({ startingPoint: [0, gap, 0] }),
  new Shape({ startingPoint: [0, 0, gap] }),
  new Shape({ startingPoint: [0, 0, -gap] }),
  // new Shape({ startingPoint: [0, 0, 0] }),
];

function tick() {
  for(let i = 0; i < 25; i++) {
    for(const shape of shapes) {
      shape.grow();
    }
  }
  draw(shapes);
};

function times(n, fn) {
  let i = 0;

  return (...args) => {
    if (i < n) {
      fn(...args);
      i++;
    }
  }
}

setInterval(times(100, tick), 10);
// for (let i = 0; i < 200; i++) tick();
// document.addEventListener('click', tick);
