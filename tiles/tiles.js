const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 150;
const tileRadius = 0.5
let DEBUG = false;

const COLOR1 = "red"
const COLOR2 = "green"
const COLOR3 = "blue"

const COLORS = [COLOR1, COLOR2, COLOR3]

const EDGES = 6

const VARIANTS_TO_EDGES = {
  'RGBRGB': [COLOR1, COLOR2, COLOR3, COLOR1, COLOR2, COLOR3],
  'RGBBRG': [COLOR1, COLOR2, COLOR3, COLOR3, COLOR1, COLOR2],
  'RRRBRG': [COLOR1, COLOR1, COLOR1, COLOR3, COLOR1, COLOR2],
  'BBBGGG': [COLOR3, COLOR3, COLOR3, COLOR2, COLOR2, COLOR2],
  'RRRGGG': [COLOR1, COLOR1, COLOR1, COLOR2, COLOR2, COLOR2],
  'RRRRRR': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR1, COLOR1]
}

const span = rangeInclusive(-3, 3)
const POSITIONS = span.map(a => span.map(b => span.map(c => [a, b, c]))).flat().flat().filter(validPosition)

function rangeInclusive(start, stop) {
  return Array(stop - start + 1).fill(null).map((_, idx) => idx + start)
}

function validPosition(position) {
  return position[0] + position[1] + position[2] === 0
}

function edgesForVariant(variant, topEdge) {
  const edges = VARIANTS_TO_EDGES[variant]
  return edges.slice(topEdge, EDGES).concat(edges.slice(0, Math.max(0, topEdge)))
}

/*
type Tile = {
  position: [a, b, c]
  topEdge: 0..SIDES-1
  variant: Variant
}

type Variant = string

type Possibility = {
  topEdge: 0,
  variant: Variant
}

type Field = {
  [position keyof string]: Possibility[]
}
*/

/*
  Top edge counts clockwise from the top:
     0
    ---
 5 /   \ 1
 4 \   / 2
    ---
     3
*/


/**
 * Wave-function-collapse.
 *
 * 1. Start with a field of all possibilities.
 * 2. Calculate 6 new fields - by choosing a random position and variant and collapsing the field for each rotation (not fully).
 * 3. Create a "union" field of all the 6 fields, discarding tiles that do not appear in every field on a given position.
 * 4. Continue from step 2 by choosing a position with lowest entropy, until all positions are visited.
 * 5. The result is a final field.
 * 6. Keep fully collapsing the final field starting with a random position and draw every few seconds.
 */

function fullField(variants, positions) {
  const allPossibilities = variants.map(variant => {
    return Array(EDGES).fill(null).map((_, topEdge) => {
      return {
        variant: variant,
        topEdge: topEdge
      }
    })
  }).reduce((acc, curr) => acc.concat(curr), [])
  // Returns field
  return positions.reduce((field, position) => {
    return {
      ...field,
      [positionToKey(position)]: allPossibilities
    }
  }, {})
}

function validField(field) {
  return Object.values(field).every(possibilities => possibilities.length > 0)
}

function positionToKey(position) {
  return JSON.stringify(position)
}

function keyToPosition(key) {
  return JSON.parse(key)
}

function lowestVariantEntropyPosition(field) {
  let minEntropy = Infinity
  let minPosition = null
  Object.keys(field).map(key => {
    const possibilities = field[key]
    const position = keyToPosition(key)
    const variants = new Set(possibilities.map(p => p.variant)).size
    const entropy = variants <= 1 ? Infinity : possibilities.length / variants // TODO
    if (entropy < minEntropy) {
      minEntropy = entropy
      minPosition = position
    }
  })
  // Returns position | null
  return minPosition
}

function lowestPossibilityEntropyPosition(field) {
  let minEntropy = Infinity
  let minPosition = null
  Object.keys(field).map(key => {
    const possibilities = field[key]
    const position = keyToPosition(key)
    const entropy = possibilities.length <= 1 ? Infinity : possibilities.length // TODO
    if (entropy < minEntropy) {
      minEntropy = entropy
      minPosition = position
    }
  })
  // Returns position | null
  return minPosition
}

function collapseFieldFromRandomPosition(initialField, entropyFn) {
  // TODO
}

function collapseField(initialField, entropyFn) {
  const fieldSize = Object.keys(initialField).length
  let currentField = initialField;
  for (let iteration = 0; iteration < fieldSize + 100; iteration += 1) {
    const chosenPosition = entropyFn(currentField)
    if (chosenPosition === null) {
      break;
    }
    const possibilities = currentField[positionToKey(chosenPosition)]
    const chosenPossibility = possibilities[Math.floor(possibilities.length * Math.random())]
    console.log("Collapsing:", chosenPosition, chosenPossibility)
    const collapsedField = collapseFieldOnPosition(currentField, chosenPosition, chosenPossibility)
    if (validField(collapsedField)) {
      currentField = collapsedField
      console.log("Collapsed.", currentField)
    } else {
      console.log("Did not collapse to a valid field. Backtracking...")
    }

    // debugField(currentField, chosenPosition)
  }

  if (entropyFn(currentField) !== null) {
    console.warn("Field was not fully collapsed!")
  }
  return currentField;
}

function neighbouringPositions(field, position) {
  // Returns positions
  return Object.keys(field).map(key => keyToPosition(key)).filter(neighbour => {
    if (neighbour[0] === position[0] && neighbour[1] === position[1] && neighbour[2] === position[2]) {
      return false
    }
    // return position.map((coordinate, index) => Math.abs(coordinate - neighbour[index])).every(diff => diff <= 1)
    const diffs = position.map((coordinate, index) => coordinate - neighbour[index]).sort()
    if (diffs[0] === -1 && diffs[1] === 0 && diffs[2] === 1) return true
    else return false
  })
}

function oppositeEdge(edge) {
  return (edge + (EDGES / 2)) % EDGES
}

function neighbourEdge(position, neighbour) {
  const diffs = position.map((coordinate, index) => neighbour[index] - coordinate)
  if (diffs[0] === 0 && diffs[1] === 1) return 0
  if (diffs[0] === 1 && diffs[1] === 0) return 1
  if (diffs[0] === 1 && diffs[1] === -1) return 2
  if (diffs[0] === 0 && diffs[1] === -1) return 3
  if (diffs[0] === -1 && diffs[1] === 0) return 4
  if (diffs[0] === -1 && diffs[1] === 1) return 5
  console.error("Positions are not neighbours!", position, neighbour)
}

function validNeighbourPossibility(possibility, edge, neighbourPossibility) {
  const neighbourEdge = oppositeEdge(edge)
  const color = edgesForVariant(possibility.variant, possibility.topEdge)[edge]
  const neighbourColor = edgesForVariant(neighbourPossibility.variant, neighbourPossibility.topEdge)[neighbourEdge]
  return color === neighbourColor
}

function collapseFieldOnPosition(field, position, possibility) {
  const currentField = {
    ...field,
    [positionToKey(position)]: [possibility]
  }
  const visitedPositionKeys = new Set()

  function visited(position) {
    return visitedPositionKeys.has(positionToKey(position))
  }

  function propagateStep(field, position) {
    if (visited(position)) {
      return field
    }
    visitedPositionKeys.add(positionToKey(position))

    // Propagation
    const allNeighbours = neighbouringPositions(field, position)
    const neighboursToPropagate = allNeighbours.filter(position => !visited(position))
    const neigboursToVisit = []
    const possibilities = field[positionToKey(position)]
    let currentField = field
    // console.log(`Visiting position`, position)
    // console.log(`Visited ${visitedPositionKeys.size} positions.`)
    // console.log(`Propagating to ${neighboursToPropagate.length} neighbours.`, neighboursToPropagate)
    neighboursToPropagate.forEach(neighbour => {
      const edge = neighbourEdge(position, neighbour)
      const neighbourPossibilities = field[positionToKey(neighbour)]
      const validNeighbourPossibilities = neighbourPossibilities.filter(np => possibilities.some(p => validNeighbourPossibility(p, edge, np)))
      // console.log(`Propagating alongside edge ${edge}`, position, neighbour)
      if (validNeighbourPossibilities.length < neighbourPossibilities.length) {
        currentField = {
          ...currentField,
          [positionToKey(neighbour)]: validNeighbourPossibilities
        }
        neigboursToVisit.push(neighbour)
      }
      // debugField(currentField, position, neighbour)
    })


    return neigboursToVisit.reduce((field, neighbour) => propagateStep(field, neighbour), currentField);
  }
  // Returns field
  return propagateStep(currentField, position, possibility)
}

function collapseFieldOnAllPositions(field) {
  // TODO: returns a list of fields
}

function mergeFields(field1, field2) {
  // TODO: returns field
}

function collapsedFieldToTiles(field) {
  // Returns tiles
  return Object.entries(field).map(([key, possibilities]) => {
    const position = keyToPosition(key)
    if (possibilities.length === 0) {
      console.warn(`Invalid field - position ${key} does not have any possibilities`)
    }
    if (possibilities.length > 1) {
      console.warn(`Invalid field - position ${key} is not fully collapsed (has ${possibilities.length} possibilities)`)
    }
    const possibility = possibilities[0]
    const tile = {
      position: position,
      topEdge: possibility.topEdge,
      variant: possibility.variant
    }
    return tile
  })
}

const state = {
  tiles: [],
  field: {}
};

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
  restart();
}

// Drawing
function draw() {
  console.time('draw')
  if (DEBUG) {
    console.log("DRAWING", state);
  }

  // Clear canvas
  clearCanvas()

  state.tiles.forEach(tile => {
    drawTile(tile)
  })
  if (state.field) {
    drawField(state.field)
  }
  console.timeEnd('draw')
}

function drawTransition(startTiles_, endTiles_, done) {
  const startTiles = startTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))
  const endTiles = endTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))

  let firstFrameAt = performance.now()
  let animationLength = 1000 // ms
  function drawAnimationFrame(timestamp) {
    const timeProgress = clamp(0, animationLength, timestamp - firstFrameAt)
    const progress = timeProgress / animationLength

    if (progress <= 1) {
      clearCanvas()
      for (let i = 0; i < endTiles.length; i += 1) {
        const startTile = startTiles[i]
        const endTile = endTiles[i]
        const edgeDiff = (endTile.topEdge - startTile.topEdge) % EDGES
        const angle = (1 - progress) * edgeDiff / EDGES * 2 * Math.PI
        drawTile(endTile, -angle)
      }

      requestAnimationFrame(drawAnimationFrame)
    } else {
      done()
    }
  }

  requestAnimationFrame(drawAnimationFrame)

  clearCanvas()
  state.tiles.forEach(tile => {
    drawTile(tile)
  })

  done()
}

function clearCanvas() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function debugField(field, debugPosition1 = null, debugPosition2 = null) {
  clearCanvas();
  drawField(field);
  if (debugPosition1) {
    drawDebugPosition(debugPosition1, "black")
  }
  if (debugPosition2) {
    drawDebugPosition(debugPosition2, "gray")
  }
  debugger;
}

function drawField(field) {
  Object.keys(field).forEach(key => {
    const position = keyToPosition(key)
    const possibilities = field[key]
    drawFieldPossibilities(position, possibilities)

    const center = hexTo2d(position)
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillText(positionToKey(position), x(center.x), y(center.y))
    ctx.restore()
  })

}

function drawFieldPossibilities(position, possibilities) {
  ctx.save()

  const center = hexTo2d(position)
  const allPossibilitiesCount = Object.keys(VARIANTS_TO_EDGES).length * EDGES
  const angleDelta = 2 * Math.PI / allPossibilitiesCount

  ctx.beginPath()
  ctx.arc(x(center.x), y(center.y), scale(tileRadius), 0, 2 * Math.PI)
  ctx.stroke()

  possibilities.forEach((possibility, idx) => {
    const angle = idx * angleDelta;
    const topPoint = { x: center.x, y: center.y + tileRadius * 0.8 }
    const tileCenter = rotateClockwise(topPoint, center, angle)
    const tileEdges = edgesForVariant(possibility.variant, possibility.topEdge)
    drawHexagon(tileCenter, tileEdges, tileRadius / 8)
  })

  ctx.restore()
  // console.log('Drawn position', position)
  // debugger
}

function drawDebugPosition(position, color) {
  ctx.save()

  const center = hexTo2d(position)
  ctx.beginPath()
  ctx.arc(x(center.x), y(center.y), scale(tileRadius * 0.3), 0, 2 * Math.PI)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.restore()
}


function drawTile(tile, rotationAngle = 0) {
  const rotatedEdges = edgesForVariant(tile.variant, tile.topEdge)
  const center = hexTo2d(tile.position)

  drawHexagon(center, rotatedEdges, tileRadius * 1.15, rotationAngle)
}

function drawHexagon(center, edges, radius, rotationAngle) {
  const niceColors = {
    [COLOR1]: '#3d184e',
    [COLOR2]: '#2e97a9',
    [COLOR3]: '#2a496e',
  }
  const centerColor = '#eee'
  const sidesExtent = 0.33
  ctx.save();

  ctx.beginPath();
  ctx.arc(x(center.x), y(center.y), scale(radius * (1 - sidesExtent)), 0, 2 * Math.PI)
  ctx.fillStyle = centerColor
  ctx.fill()

  edges.forEach((color, rotation) => {
    const angleStart = rotationAngle + (rotation - 0.5) / EDGES * 2 * Math.PI;
    const angleEnd = rotationAngle + (rotation + 0.5) / EDGES * 2 * Math.PI;

    const topPoint = { x: center.x, y: center.y + radius }
    const bottomPoint = { x: center.x, y: center.y + radius * (1 - sidesExtent) }
    const startPoint = rotateClockwise(topPoint, center, angleStart)
    const endPoint = rotateClockwise(topPoint, center, angleEnd)
    const startBottomPoint = rotateClockwise(bottomPoint, center, angleStart)
    const endBottomPoint = rotateClockwise(bottomPoint, center, angleEnd)
    const niceColor = niceColors[color] || color

    ctx.save();
    ctx.beginPath()
    ctx.moveTo(x(startPoint.x), y(startPoint.y))
    ctx.lineTo(x(endPoint.x), y(endPoint.y))
    ctx.lineTo(x(endBottomPoint.x), y(endBottomPoint.y))
    ctx.lineTo(x(startBottomPoint.x), y(startBottomPoint.y))
    ctx.closePath()
    ctx.fillStyle = niceColor
    ctx.strokeStyle = niceColor // "#333"
    ctx.fill()
    ctx.stroke()
    ctx.restore();
    // debugger;
  })

  ctx.restore();

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

function distance2d([x1, y1], [x2, y2]) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// https://www.redblobgames.com/grids/hexagons/#basics
function hexTo2d([a, _, c]) {
  const q = a
  const r = c
  const size = 0.6
  var dx = size * (3 / 2 * q)
  var dy = -1 * size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r)
  return { x: dx, y: dy };
};

function clamp(a, b, value) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

adjustCanvasSize();
window.addEventListener('resize', () => adjustCanvasSize());
window.addEventListener('resize', () => draw());
canvas.addEventListener('click', handleCanvasClick);

function restart() {
  if (state.tiles.length > 0) {
    // Transition
    const startTiles = state.tiles.map(tile => ({ ...tile, topEdge: 0 }))
    const endTiles = state.tiles
    drawTransition(startTiles, endTiles, () => {
      state.tiles = endTiles
    })
  } else {
    // Initial tiles
    const initialField = fullField(Object.keys(VARIANTS_TO_EDGES), POSITIONS)
    const collapsedField = collapseField(initialField, lowestPossibilityEntropyPosition)
    const tiles = collapsedFieldToTiles(collapsedField)
    // state.field = collapsedField
    state.field = {}
    state.tiles = tiles
    draw()
  }
}
restart();
