const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 200

let DEBUG = true;

const colorFlower = '#bd1313'
const colorStem = '#666'
const colorBackground = '#f0f0f0'

const state = {
  flowers: [],
};

// Positioning
const devicePixelRatio = window.devicePixelRatio || 1;
const offsetY = -0.5

function scale(value) {
  return value * unitLength * devicePixelRatio;
}
function x(value) {
  return canvas.width / 2 + scale(value);
}
function y(value) {
  return canvas.height / 2 - scale(value + offsetY);
}
function invertX(xValue) {
  const value = (xValue - canvas.width / devicePixelRatio / 2) / unitLength;
  console.assert(Math.abs(xValue * devicePixelRatio - x(value)) < 0.001, "invertX failed");
  return value;
}
function invertY(yValue) {
  const value = -(yValue - canvas.height / devicePixelRatio / 2) / unitLength;
  console.assert(Math.abs(yValue * devicePixelRatio - y(value)) < 0.001, "invertY failed");
  return value;
}

// Event handlers
function adjustCanvasSize() {
  const width = document.body.clientWidth;
  const height = document.body.clientHeight;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
}

function handleCanvasClick(event) {
  restart();
}

function pointCloseTo(point1, point2, distance) {
  return distance2d(point1, point2) < distance
}

function circlePack(numCircles, initialCircles, extent = 2, minNeighbors = 1, maxNeighbors = Infinity) {
  const circles = []
  const allCircles = initialCircles
  const minGap = 0.1
  const maxGap = 0.2
  let iterations = 0
  for (let i = 0; i < numCircles;) {
    iterations += 1
    const x = extent * 3 * (Math.random() - 0.5)
    const y = extent * 2 * (Math.random() - 0.5)
    const radius = 0.3 + Math.random() * 0.05
    const position = { x, y }
    const valid = allCircles.every(c => !pointCloseTo(c.position, position, c.radius + radius + minGap))
    const neighbors = allCircles.filter(c => !pointCloseTo(c.position, position, c.radius + radius + minGap) && pointCloseTo(c.position, position, c.radius + radius + maxGap))
    if (circles.length === 0 || (valid && neighbors.length >= minNeighbors && neighbors.length <= maxNeighbors)) {
      circles.push({ position, radius })
      allCircles.push({ position, radius })
      i += 1
      iterations = 0
    }
    if (iterations > 1000) {
      break
    }
  }
  return circles;
}

const seed = Math.random()

// Drawing
function draw(state) {
  if (DEBUG) {
    // console.log("DRAWING", scene);
  }

  // Clear canvas
  clearCanvas()

  // Draw stems
  state.flowers.forEach(flower => {
    drawStem(flower.position)
  })

  // Draw flowers
  state.flowers.forEach(flower => {
    drawFlower(flower.position, flower.radius, flower.numEdges, colorFlower)
  })
}

function drawStem(position) {
  const jitter = 0.02
  const root = { x: 0 + Math.random() * jitter, y: -1 + Math.random() * jitter };
  const halfway = minus(position, root)
  const control = {
    x: root.x + halfway.x * 0.7 - Math.random() * halfway.x,
    y: root.y + halfway.y * 0.7
  }
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x(root.x), y(root.y))
  // ctx.lineTo(x(position.x), y(position.y))
  ctx.quadraticCurveTo(x(control.x), y(control.y), x(position.x), y(position.y))
  ctx.lineWidth = 1
  ctx.strokeStyle = colorStem
  ctx.stroke()
  ctx.closePath()
  ctx.restore()
}

function drawFlower(position, radius, numEdges, color) {
  const root = { x: 0, y: -1 }
  const tiltPosition = minus(position, root)
  const tilt = Math.atan2(tiltPosition.y, tiltPosition.x) + Math.PI * 0.5
  const initialAngle = Math.random() * Math.PI;
  const radiusX = radius
  const radiusY = radius * (0.5 + Math.random() * 0.25)
  const edges = Array(numEdges).fill(null).map((_, i) => {
    const angle = initialAngle + i * (1 / numEdges) * 2 * Math.PI
    const x = position.x + Math.sin(angle) * radiusX
    const y = position.y + Math.cos(angle) * radiusY
    return rotateClockwise({ x, y }, position, tilt)
  })
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x(edges[0].x), y(edges[0].y))
  edges.forEach(edge => {
    ctx.lineTo(x(edge.x), y(edge.y))
  })
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

function clearCanvas() {
  ctx.save();
  ctx.fillStyle = colorBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Utilities

function distance2d({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function clamp(a, b, value) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function minus(pos1, pos2) {
  return { x: pos1.x - pos2.x, y: pos1.y - pos2.y };
}

function plus(pos1, pos2) {
  return { x: pos1.x + pos2.x, y: pos1.y + pos2.y };
}

function rotateClockwise(pos, origin, angle) {
  const rooted = minus(pos, origin);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const rotated = {
    x: cos * rooted.x + sin * rooted.y,
    y: sin * rooted.x + cos * rooted.y
  };
  return plus(rotated, origin);
}

adjustCanvasSize();
window.addEventListener('resize', () => adjustCanvasSize());
// window.addEventListener('resize', () => draw());
canvas.addEventListener('click', handleCanvasClick);

function restart() {
  const numEdges = 3 + Math.floor(Math.random() * 3)
  const numFlowers = 3 + Math.floor(Math.random() * 2)
  const flowers = circlePack(numFlowers, [], 0.5)
    .map(circle => ({ position: { x: circle.position.x, y: circle.position.y + 1 }, radius: circle.radius }))
    .map((circle, i) => {
      return {
        position: circle.position,
        radius: circle.radius,
        numEdges: numEdges
      }
    })
  state.flowers = flowers
  draw(state)
}

restart();
