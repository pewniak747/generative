const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 200

let DEBUG = false;

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

function generateRandomPolygon() {
  return [
    { x: -1.2, y: 1.5 },
    { x: -1.2, y: -1.5 },
    { x: 1.2, y: -1.5 },
    { x: 1.2, y: 1.5 },
  ]
}

function generateScratches(polygon) {
  const center = polygonCenter(polygon);

  // Spine
  const spineExtent = 4
  const spineAngle = 2 * Math.PI * Math.random();
  const spineBentAngle = spineAngle + (Math.random() - 0.5) * Math.PI / 5
  const spineStart = {
    x: center.x - spineExtent * Math.sin(spineAngle),
    y: center.y + spineExtent * Math.cos(spineAngle)
  }
  const spineMiddle = center
  const spineEnd = {
    x: center.x + spineExtent * Math.sin(spineBentAngle),
    y: center.y - spineExtent * Math.cos(spineBentAngle)
  }
  const spine = [spineStart, spineMiddle, spineEnd]

  // Ribs
  const ribSpacing = 0.05
  const ribExtent = spineExtent
  const ribs = []
  let ribsEnded = false
  let ribProgress = 0.0
  while (!ribsEnded) {
    let currentRibProgress = 0.0
    let intersectingSpineSegment = null
    let intersectingSpineSegmentProgress = null
    for (let spineIndex = 0; spineIndex < spine.length - 1; spineIndex += 1) {
      const segmentStart = spine[spineIndex]
      const segmentEnd = spine[spineIndex + 1]
      const segmentLength = distance2d(segmentStart, segmentEnd)
      if (currentRibProgress <= ribProgress && ribProgress < currentRibProgress + segmentLength) {
        intersectingSpineSegment = [segmentStart, segmentEnd]
        intersectingSpineSegmentProgress = (ribProgress - currentRibProgress) / segmentLength
        break
      } else {
        currentRibProgress += segmentLength
      }
    }


    if (intersectingSpineSegment) {
      ribsStarted = true
      const intersectingSpinePoint = {
        x: intersectingSpineSegment[0].x + (intersectingSpineSegment[1].x - intersectingSpineSegment[0].x) * intersectingSpineSegmentProgress,
        y: intersectingSpineSegment[0].y + (intersectingSpineSegment[1].y - intersectingSpineSegment[0].y) * intersectingSpineSegmentProgress
      }
      // console.debug(intersectingSpinePoint)
      const a = (intersectingSpineSegment[0].y - intersectingSpinePoint.y)
      const b = (intersectingSpineSegment[0].x - intersectingSpinePoint.x)
      const beta = Math.atan(b / a)
      const alpha = Math.PI / 2 - beta
      // console.debug("ANGLES", alpha, beta, b, a)
      const ribStart = {
        x: intersectingSpinePoint.x - ribExtent * Math.sin(alpha),
        y: intersectingSpinePoint.y + ribExtent * Math.cos(alpha)
      }
      const ribEnd = {
        x: intersectingSpinePoint.x + ribExtent * Math.sin(alpha),
        y: intersectingSpinePoint.y - ribExtent * Math.cos(alpha)
      }
      if (a !== 0) {
        ribs.push([ribStart, ribEnd])
      }
    } else {
      ribsEnded = true
    }
    ribProgress += ribSpacing
  }

  const points = []
  ribs.forEach(rib => {
    // console.debug("RIB", rib)
    const ribIntersectionPoints = polygonSegmentIntersectionPoints(polygon, rib)
    if (ribIntersectionPoints.length > 0) {
      const lastPoint = points[points.length - 1]
      if (lastPoint) {
        const sortedIntersectionPoints = ribIntersectionPoints
          .map(point => [point, distance2d(point, lastPoint)])
          .sort(([p1, d1], [p2, d2]) => d2 - d1)
          .map(([point, d]) => point)
        points.push(sortedIntersectionPoints[0])
      } else {
        points.push(ribIntersectionPoints[0])
      }
    }
  })
  // console.debug(points)

  return { points, spine, ribs }
}

function generateSubPolygons(polygon, points) {
  const subPolygons = []
  let startPointIdx = 0
  let endPointIdx = 1
  const minSubPolygonArea = polygonArea(polygon) / 4

  while (endPointIdx < points.length) {
    const startPoints = points.slice(startPointIdx, startPointIdx + 2)
    const endPoints = points.slice(endPointIdx - 1, endPointIdx + 1)
    if (startPointIdx % 2 !== endPointIdx % 2) {
      endPoints.reverse()
    }
    const subPolygon = startPoints.concat(endPoints)
    const area = polygonArea(subPolygon)

    if (area > minSubPolygonArea) {
      console.debug(area, subPolygon, startPointIdx, endPointIdx)
      subPolygons.push(subPolygon)
      startPointIdx = endPointIdx - 1
      endPointIdx = startPointIdx + 1
    } else {
      endPointIdx += 1
    }
  }

  return subPolygons
}

function polygonCenter(polygon) {
  const sumX = polygon.reduce((acc, point) => acc + point.x, 0)
  const sumY = polygon.reduce((acc, point) => acc + point.y, 0)
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length
  }
}

function polygonArea(polygon) {
  const center = polygonCenter(polygon)
  let area = 0
  for (let i = 0; i < polygon.length; i += 1) {
    area += triangleArea(center, polygon[i], polygon[(i + 1) % polygon.length])
  }
  return area;
}

// https://en.wikipedia.org/wiki/Triangle#Using_Heron's_formula
function triangleArea(A, B, C) {
  const a = distance2d(A, B)
  const b = distance2d(B, C)
  const c = distance2d(C, A)
  const s = (a + b + c) / 2
  return Math.sqrt(s * (s - a) * (s - b) * (s - c))
}

function polygonSegmentIntersectionPoints(polygon, segment) {
  const intersectionPoints = []
  for (let i = 0; i < polygon.length; i += 1) {
    const polygonSegmentStart = polygon[i]
    const polygonSegmentEnd = polygon[(i + 1) % polygon.length]
    const intersect = lineIntersectionPoint(segment[0], segment[1], polygonSegmentStart, polygonSegmentEnd)
    // console.debug("INTERSECT", intersect)
    if (intersect && intersect.segmentsIntersect) {
      intersectionPoints.push({ x: intersect.x, y: intersect.y })
    }
  }
  return intersectionPoints
}

// Drawing
const backgroundColor = '#f6f6f6';

function drawPolygon(polygon) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x(polygon[0].x), y(polygon[0].y))
  polygon.forEach(point => {
    ctx.lineTo(x(point.x), y(point.y))
  })
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawSubPolygon(polygon) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x(polygon[0].x), y(polygon[0].y))
  polygon.forEach(point => {
    ctx.lineTo(x(point.x), y(point.y))
  })
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}


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
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round'
  ctx.setLineDash(lineDash)
  ctx.stroke();
  ctx.restore();
}

function draw(scene) {
  const { polygon, points, spine, ribs, subPolygons } = scene;

  console.time('draw')
  if (DEBUG) {
    console.log("DRAWING", state);
  }

  // Clear canvas
  clearCanvas()
  drawPolygon(polygon)
  if (DEBUG) {
    const center = polygonCenter(polygon)
    drawDebugPoint(center)
    drawDebugLine(spine)
    ribs.forEach(rib => {
      drawDebugLine(rib, 'blue', [1, 5])
    })
    points.forEach(point => drawDebugPoint(point))
  }
  // drawDebugLine(points, 'green')
  subPolygons.forEach(subPolygon => {
    drawSubPolygon(subPolygon)
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

adjustCanvasSize();
window.addEventListener('resize', () => adjustCanvasSize());
// window.addEventListener('resize', () => draw());
canvas.addEventListener('click', handleCanvasClick);

function restart() {
  const polygon = generateRandomPolygon();
  const { points, spine, ribs } = generateScratches(polygon)
  const subPolygons = generateSubPolygons(polygon, points)
  console.log(subPolygons)
  draw({ polygon, points, spine, ribs, subPolygons })
}

restart();
