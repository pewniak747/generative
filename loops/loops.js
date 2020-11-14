const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 200

let DEBUG = true;

const state = {};

// Positioning
const devicePixelRatio = window.devicePixelRatio || 1;
function scale(value) {
  return value * unitLength * devicePixelRatio;
}
function x(value) {
  return canvas.width / 2 + scale(value);
}
function y(value) {
  return canvas.height / 2 - scale(value);
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
  const clickCoordinates = {
    x: invertX(event.x),
    y: invertY(event.y)
  }
  restart(clickCoordinates);
}

// Logic

function generateCircleLoop(center, radius) {
  const resolution = 300
  const points = []
  for (let i = 0; i < resolution + 1; i += 1) {
    const angle = i / resolution * 2 * Math.PI
    const x = center.x + radius * Math.sin(angle)
    const y = center.y + radius * Math.cos(angle)
    points.push({ x, y })
  }
  return [points]
}

function calculateIntersectionPoints(loops) {
  const intersectionPoints = []

  for (let i = 0; i < loops.length; i += 1) {
    for (let l = i + 1; l < loops.length; l += 1) {
      const loop1 = loops[i]
      const loop2 = loops[l]
      const loopIntersectionPoints = calculateLoopsIntersectionPoints(loop1, loop2)
      loopIntersectionPoints.forEach(((intersection, pointIdx) => {
        const order = pointIdx % 2 === 0 ? { belowLoopIdx: i, aboveLoopIdx: l } : { belowLoopIdx: l, aboveLoopIdx: i }
        intersectionPoints.push({ ...order, point: intersection.point, segment: intersection.segments[1 - pointIdx % 2] })
      }))
    }
  }

  return intersectionPoints
}

function calculateLoopsIntersectionPoints(loop1, loop2) {
  const intersections = []
  loop1.forEach(outerSegment => {
    for (let i = 0; i < outerSegment.length - 1; i += 1) {
      const segment1 = outerSegment.slice(i, i + 2)
      loop2.forEach(innerSegment => {
        for (let l = 0; l < innerSegment.length - 1; l += 1) {
          const segment2 = innerSegment.slice(l, l + 2)
          const intersect = lineIntersectionPoint(segment1[0], segment1[1], segment2[0], segment2[1])
          if (intersect.segmentsIntersect) {
            const intersectionSegments = [
              loopSegmentCloseTo(outerSegment, intersect, 0.5),
              loopSegmentCloseTo(innerSegment, intersect, 0.5)
            ]
            intersections.push({ point: { x: intersect.x, y: intersect.y }, segments: intersectionSegments })
          }
        }
      })
    }
  })
  return intersections
}

function loopSegmentCloseTo(segment, intersect, radius) {
  const intersectionSegmentEnd = takeEnd(segment, point => pointCloseTo(point, intersect, radius))
  const intersectionSegmentStart = takeStart(segment, point => pointCloseTo(point, intersect, radius))
  if (intersectionSegmentStart.length === intersectionSegmentEnd.length && intersectionSegmentStart[0].x === intersectionSegmentEnd[0].x) {
    return intersectionSegmentStart
  } else {
    return intersectionSegmentEnd.concat(intersectionSegmentStart)
  }
}

function breakLoops(loops, intersections) {
  return loops.map((loop, loopIdx) => {
    let brokenLoop = loop
    const breakIntersections = intersections.filter(intersection => intersection.belowLoopIdx === loopIdx)
    console.log("INTERSECTIONS", breakIntersections)
    breakIntersections.forEach(({ segment }) => {
      brokenLoop = breakLoop(brokenLoop, segment)
    })
    return brokenLoop
  })
}

function breakLoop(loop, intersectionSegment) {
  const minDistance = 0.1
  return loop.map(segment => {
    const brokenSegments = []
    let brokenSegment = []
    for (let i = 0; i < segment.length; i += 1) {
      const point = segment[i]
      if (!pointCloseToSegment(point, intersectionSegment, minDistance)) {
        brokenSegment.push(point)
      } else {
        if (brokenSegment.length) {
          brokenSegments.push(brokenSegment)
          brokenSegment = []
        }
      }
    }
    if (brokenSegment.length) {
      brokenSegments.push(brokenSegment)
    }
    return brokenSegments
  }).reduce((acc, segments) => acc.concat(segments), [])
}

function circleIntersectsSegment(point1, point2, center, radius) {
  return distance2d(point1, center) < radius || distance2d(point2, center) < radius // FIXME
}

function pointCloseToSegment(point, segment, distance) {
  return segment.some(segmentPoint => pointCloseTo(point, segmentPoint, distance)) // FIXME
}

function pointCloseTo(point1, point2, distance) {
  return distance2d(point1, point2) < distance
}

// Drawing
const backgroundColor = '#fff';
const loopColors = [
  '#f3bebc',
  '#e7a8e3',
  '#a09cf3',
  '#f2ddc0',
  '#90dad9',
  '#adeac3'
]

function drawDebugPoint(point) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x(point.x), y(point.y), 5, 0, 2 * Math.PI)
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'red';
  ctx.stroke();
  ctx.restore();
}

function drawDebugLine(points, color = 'red', lineDash = []) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x(points[0].x), y(points[0].y))
  points.forEach(point => {
    ctx.lineTo(x(point.x), y(point.y))
  })
  ctx.lineWidth = scale(0.05);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round'
  ctx.setLineDash(lineDash)
  ctx.stroke();
  ctx.restore();
}

function drawLoop(loop, color = 'red') {
  ctx.save()
  loop.forEach(segment => {
    drawDebugLine(segment, color)
  })
  ctx.restore()
}

function draw(scene) {
  const { loops, intersectionPoints } = scene;

  console.time('draw')
  if (DEBUG) {
    console.log("DRAWING", scene);
  }

  // Clear canvas
  clearCanvas()
  loops.forEach((loop, idx) => {
    drawLoop(loop, loopColors[idx % loopColors.length])
  })

  intersectionPoints.forEach(({ point, segment }) => {
    // drawDebugPoint(point)
    // drawDebugLine(segment, 'blue', [5, 30])
  })

  console.timeEnd('draw')
}

function clearCanvas() {
  ctx.save();
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Utilities

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

function distance2d({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function lineIntersectionPoint({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false
  }
  denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
  // Lines are parallel
  if (denominator === 0) {
    return false
  }
  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator
  // is the intersection along the segments
  /*
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false
  }
  */
  const segmentsIntersect = !(ua < 0 || ua > 1 || ub < 0 || ub > 1);
  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);
  return { x, y, segmentsIntersect };
}


function clamp(a, b, value) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function rangeInclusive(start, stop) {
  return Array(stop - start + 1).fill(null).map((_, idx) => idx + start)
}

function takeStart(list, predicate) {
  const result = []
  for (let i = 0; i < list.length; i += 1) {
    if (predicate(list[i])) {
      result.push(list[i])
    } else if (result.length > 0) {
      break;
    }
  }
  return result;
}

function takeEnd(list, predicate) {
  const result = []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (predicate(list[i])) {
      result.unshift(list[i])
    } else if (result.length > 0) {
      break;
    }
  }
  return result;
}

adjustCanvasSize();
window.addEventListener('resize', () => adjustCanvasSize());
// window.addEventListener('resize', () => draw());
canvas.addEventListener('click', handleCanvasClick);

function restart() {
  const loop1 = generateCircleLoop({ x: -0.5, y: 0.2 }, 0.5 + Math.random())
  const loop2 = generateCircleLoop({ x: 0.5, y: -0.2 }, 0.5 + Math.random())
  const loop3 = generateCircleLoop({ x: 0.5, y: 0.8 }, 0.5 + Math.random())
  const loop4 = generateCircleLoop({ x: 1.5, y: 1.8 }, 0.5 + Math.random())
  /*
  const loops = [
    loop1,
    loop2,
    loop3,
    loop4
  ]
  */
  const loops = Array(6).fill(null).map(() => generateCircleLoop({ x: 4 * (Math.random() - 0.5), y: 4 * (Math.random() - 0.5) }, 1 + Math.random()))
  const intersectionPoints = calculateIntersectionPoints(loops)
  const brokenLoops = breakLoops(loops, intersectionPoints)
  draw({ loops: brokenLoops, intersectionPoints })
}

restart();
