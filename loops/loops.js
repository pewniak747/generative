const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 150

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
  const resolution = 100
  const points = []
  for (let i = 0; i < resolution + 1; i += 1) {
    const angle = i / resolution * 2 * Math.PI
    const x = center.x + radius * Math.sin(angle)
    const y = center.y + radius * Math.cos(angle)
    points.push({ x, y })
  }
  return [points]
}

function generateRandomLoop(pointsCount = 10, extent = 4, tight = false) {
  const resolution = 6
  const points = []
  const circles = circlePack(pointsCount, extent, tight ? 1 : 0, Infinity)
  for (let i = 0; i < circles.length; i += 1) {
    const x = circles[i].center.x
    const y = circles[i].center.y
    points.push([x, y])
  }
  points.push(points[0])
  points.push(points[1])
  const smoothedPoints = chaikin(points, resolution, false).map(([x, y]) => ({ x, y }))
  const slicedPoints = smoothedPoints.slice(Math.pow(2, resolution), smoothedPoints.length - Math.pow(2, resolution))
  slicedPoints.push(slicedPoints[0])
  return [slicedPoints]
}

function generateRandomLoops(loopsCount, generateLoopFn, validateCandidateLoopFn) {
  let loops = []
  let intersections = []
  const iterations = loopsCount + 500
  for (let i = 0; i < iterations; i += 1) {
    if (loops.length === loopsCount) break
    console.log(`Iteration ${i}, loops: ${loops.length}`)

    const candidateLoop = generateLoopFn(loops)
    const candidateIntersections = calculateIntersections([...loops, candidateLoop], candidateLoop)
    const valid = validateCandidateLoopFn(loops, intersections, candidateLoop, candidateIntersections)
    if (valid) {
      loops = [...loops, candidateLoop]
      intersections = [...intersections, ...candidateIntersections]
    }

  }
  return loops;
}

function calculateIntersections(loops, loop) {
  const intersections = []

  for (let i = 0; i < loops.length; i += 1) {
    const loop1 = loops[i]
    const loop2 = loop
    const loopIntersections = loop1 === loop2 ? calculateLoopSelfIntersections(loop1) : calculateLoopsIntersections(loop1, loop2)
    loopIntersections.forEach(((intersection, pointIdx) => {
      const order = pointIdx % 2 === 0 ? { belowLoopIdx: i, aboveLoopIdx: loops.length - 1 } : { belowLoopIdx: loops.length - 1, aboveLoopIdx: i }
      intersections.push({ ...order, point: intersection.point, angle: intersection.angle, segment: intersection.segments[1 - pointIdx % 2] })
    }))
  }

  return intersections
}

function calculateCrossIntersections(loops) {
  const intersections = []

  for (let i = 0; i < loops.length; i += 1) {
    for (let l = i; l < loops.length; l += 1) {
      const loop1 = loops[i]
      const loop2 = loops[l]
      const loopIntersections = loop1 === loop2 ? calculateLoopSelfIntersections(loop1) : calculateLoopsIntersections(loop1, loop2)
      loopIntersections.forEach(((intersection, pointIdx) => {
        const order = pointIdx % 2 === 0 ? { belowLoopIdx: i, aboveLoopIdx: l } : { belowLoopIdx: l, aboveLoopIdx: i }
        intersections.push({ ...order, point: intersection.point, angle: intersection.angle, segment: intersection.segments[1 - pointIdx % 2] })
      }))
    }
  }

  return intersections
}

function calculateLoopsIntersections(loop1, loop2) {
  const intersections = []
  loop1.forEach(outerSegment => {
    for (let i = 0; i < outerSegment.length - 1; i += 1) {
      const segment1 = outerSegment.slice(i, i + 2)
      loop2.forEach(innerSegment => {
        for (let l = 0; l < innerSegment.length - 1; l += 1) {
          const segment2 = innerSegment.slice(l, l + 2)
          const intersection = calculateSegmentIntersection(outerSegment, innerSegment, segment1, segment2)
          if (intersection) {
            intersections.push(intersection)
          }
        }
      })
    }
  })
  return intersections
}

function calculateLoopSelfIntersections(loop1) {
  const intersections = []
  loop1.forEach(outerSegment => {
    for (let i = 0; i < outerSegment.length - 1; i += 1) {
      const outerSegmentSlice = loop1.length === 1 ? [...outerSegment, ...outerSegment] : outerSegment
      const segment1 = outerSegmentSlice.slice(i, i + 2)
      loop1.forEach(innerSegment => {
        const innerSegmentSlice = loop1.length === 1 ? [...innerSegment, ...innerSegment] : innerSegment
        for (let l = innerSegment === outerSegment ? i + 1 : 0; l < innerSegment.length; l += 1) {
          const segment2 = innerSegmentSlice.slice(l, l + 2)
          if (pointsEqual(segment1[0], segment2[0]) || pointsEqual(segment1[0], segment2[1]) || pointsEqual(segment1[1], segment2[0])) {
            continue
          }
          const intersection = calculateSegmentIntersection(outerSegment, innerSegment, segment1, segment2)
          if (intersection) {
            intersections.push(intersection)
          }
        }
      })
    }
  })
  return intersections
}

function calculateSegmentIntersection(outerSegment, innerSegment, segment1, segment2) {
  const intersect = lineIntersectionPoint(segment1[0], segment1[1], segment2[0], segment2[1])
  if (intersect.segmentsIntersect) {
    const intersectionSegments = [
      loopSegmentCloseTo(outerSegment, intersect, 0.5),
      loopSegmentCloseTo(innerSegment, intersect, 0.5)
    ]
    const angle = lineIntersectionAngle(segment1[0], segment1[1], segment2[0], segment2[1])
    return { point: { x: intersect.x, y: intersect.y }, segments: intersectionSegments, angle }
  } else {
    return null
  }
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
    breakIntersections.forEach((intersection) => {
      brokenLoop = breakLoop(brokenLoop, intersection)
    })
    return brokenLoop
  })
}

function breakLoop(loop, intersection) {
  const minSegmentDistance = 0.1
  const maxPointDistance = 0.2
  let broken = false
  return loop.map(segment => {
    if (broken) return [segment]
    const brokenSegments = []
    let brokenSegment = []
    for (let i = 0; i < segment.length; i += 1) {
      const point = segment[i]
      if ((brokenSegments.length > 0 && brokenSegment.length > 0) || !pointCloseToSegment(point, intersection.segment, minSegmentDistance) || !pointCloseTo(point, intersection.point, maxPointDistance)) {
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
    if (brokenSegments.length > 1) {
      broken = true
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

function circlePack(numCircles, extent = 4, minNeighbors = 1, maxNeighbors = Infinity) {
  const circles = []
  const minGap = 0.1
  const maxGap = 0.15
  let iterations = 0
  for (let i = 0; i < numCircles;) {
    iterations += 1
    const x = extent * 2 * (Math.random() - 0.5)
    const y = extent * 2 * (Math.random() - 0.5)
    const radius = 0.5 + Math.random() * 0.2
    const center = { x, y }
    const valid = circles.every(c => !pointCloseTo(c.center, center, c.radius + radius + minGap))
    const neighbors = circles.filter(c => !pointCloseTo(c.center, center, c.radius + radius + minGap) && pointCloseTo(c.center, center, c.radius + radius + maxGap))
    if (circles.length === 0 || (valid && neighbors.length >= minNeighbors && neighbors.length <= maxNeighbors)) {
      circles.push({ center, radius })
      i += 1
      iterations = 0
    }
    if (iterations > 1000) {
      break
    }
  }
  return circles;
}

function gridPack(extentX = 3, extentY = 3) {
  const circles = []
  for (let x = -1 * extentX; x <= extentX; x += 1) {
    for (let y = -1 * extentY; y <= extentY; y += 1) {
      const radius = 0.3 + Math.random() * 0.2
      const center = { x, y }
      circles.push({ center, radius })
    }
  }
  return circles;
}

// Drawing
const backgroundColor = '#111';
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
  const { loops, intersections } = scene;

  console.time('draw')
  if (DEBUG) {
    console.log("DRAWING", scene);
  }

  // Clear canvas
  clearCanvas()
  loops.forEach((loop, idx) => {
    drawLoop(loop, loopColors[idx % loopColors.length])
  })

  intersections.forEach(({ point, segment }) => {
    drawDebugPoint(point)
    // drawDebugLine(segment, 'rgba(0, 0, 0, 0.05)', [5, 30])
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

function slope({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  return (y2 - y1) / (x2 - x1)
}

function angle(s1, s2) {
  return Math.atan((s2 - s1) / (1 + (s2 * s1)))
}

function lineIntersectionAngle(p1, p2, p3, p4) {
  const slope1 = slope(p1, p2)
  const slope2 = slope(p3, p4)
  return angle(slope1, slope2)
}

function clamp(a, b, value) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function pointsEqual(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y
}

function rangeInclusive(start, stop) {
  return Array(stop - start + 1).fill(null).map((_, idx) => idx + start)
}

function randomIntegerBetween(low, high) {
  return low + Math.floor((high - low + 1) * Math.random())
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

// https://www.npmjs.com/package/chaikin
function cut(start, end, ratio) {
  const r1 = [start[0] * (1 - ratio) + end[0] * ratio, start[1] * (1 - ratio) + end[1] * ratio];
  const r2 = [start[0] * ratio + end[0] * (1 - ratio), start[1] * ratio + end[1] * (1 - ratio)];
  return [r1, r2];
}

function chaikin(curve, iterations = 1, closed = false, ratio = 0.25) {
  if (ratio > 0.5) {
    ratio = (1 - ratio);
  }

  for (let i = 0; i < iterations; i++) {
    let refined = [];
    refined.push(curve[0]);

    for (let j = 1; j < curve.length; j++) {
      let points = cut(curve[j - 1], curve[j], ratio);
      refined = refined.concat(points);
    }

    if (closed) {
      refined = refined.concat(cut(curve[curve.length - 1], curve[0], ratio));
    } else {
      refined.push(curve[curve.length - 1]);
    }

    curve = refined;
  }
  return curve;
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
  // const packedCircles = circlePack(25, 4, 1, Infinity)
  // const packedCircles = gridPack(2, 1)
  // const loops = packedCircles.map(circle => generateCircleLoop({ x: circle.center.x, y: circle.center.y }, circle.radius + 0.2))
  /*
  const loops = [
    generateRandomLoop(3),
    generateRandomLoop(3),
    generateRandomLoop(3),
    generateRandomLoop(3),
    generateRandomLoop(3),
    generateRandomLoop(3),
  ]
  */
  function generate(loops) {
    const length = loops.length < 1 ? 8 : 3 + Math.floor(Math.random() * 3)
    // const length = loops.length < 2 ? 6 : 3
    const tight = loops.length > 1
    return generateRandomLoop(length, 5, tight)
  }
  function validate(loops, intersections, candidateLoop, candidateIntersections) {
    const minDistance = 0.5
    const allIntersections = [...intersections, ...candidateIntersections]
    if (loops.length > 0 && candidateIntersections.length === 0) return false
    const tooSteep = candidateIntersections.some(candidateIntersection => {
      const angleDiff = Math.abs(Math.PI / 2 - Math.abs(candidateIntersection.angle))
      return angleDiff > Math.PI / 6
    })
    const intersectsOthers = candidateIntersections.filter(candidateIntersection => {
      const isBelow = candidateIntersection.belowLoopIdx !== loops.length
      const isAbove = candidateIntersection.aboveLoopIdx !== loops.length
      return isAbove != isBelow
    }).length > 0
    if (tooSteep) { return false }
    if (loops.length > 0 && !intersectsOthers) { return false }
    return candidateIntersections.every(candidateIntersection => {
      return allIntersections.filter(i => i !== candidateIntersection).every(intersection => {
        return distance2d(candidateIntersection.point, intersection.point) > minDistance
      })
    })
  }
  const loops = generateRandomLoops(5, generate, validate)
  const intersections = calculateCrossIntersections(loops)
  const brokenLoops = breakLoops(loops, intersections)
  draw({ loops: brokenLoops, intersections })
}

restart();
