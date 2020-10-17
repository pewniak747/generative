const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 200;
const tileRadius = 0.5
let DEBUG = false;

const COLOR1 = "red"
const COLOR2 = "green"
const COLOR3 = "blue"
const COLOR4 = "yellow"

const COLORS = [COLOR1, COLOR2, COLOR3, COLOR4]

const EDGES = 6

const VARIANTS_TO_EDGES = {
  //'111111': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR1, COLOR1],
  //'112111': [COLOR1, COLOR1, COLOR2, COLOR1, COLOR1, COLOR1],
  '112211': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR1, COLOR1],
  '112221': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR1],
  //'112222': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR2],
  //'122222': [COLOR1, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
  //'222222': [COLOR2, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
  //'121212': [COLOR1, COLOR2, COLOR1, COLOR2, COLOR1, COLOR2],
  //'112112': [COLOR1, COLOR1, COLOR2, COLOR1, COLOR1, COLOR2],
  // '112222': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR2],
  // '333333': [COLOR3, COLOR3, COLOR3, COLOR3, COLOR3, COLOR3],
  // '333111': [COLOR3, COLOR3, COLOR3, COLOR1, COLOR1, COLOR1],
  // '113322': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR2, COLOR2],
  // '112244': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR4, COLOR4],
  // '113344': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR4, COLOR4],
  // '223344': [COLOR2, COLOR2, COLOR3, COLOR3, COLOR4, COLOR4],
  // '333222': [COLOR3, COLOR3, COLOR3, COLOR2, COLOR2, COLOR2],
  // '111222': [COLOR1, COLOR1, COLOR1, COLOR2, COLOR2, COLOR2],
  // '111111': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR1, COLOR1],
  // '222111': [COLOR2, COLOR2, COLOR2, COLOR1, COLOR1, COLOR1],
  // '222222': [COLOR2, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
}

const span = rangeInclusive(-2, 2)
const POSITIONS = span.map(a => span.map(b => span.map(c => [a, b, c]))).flat().flat().filter(validPosition)// [[0, 0, 0], [0, -1, 1], [1, -1, 0], [1, 0, -1]]

function freeze(obj) {
  return Object.freeze(obj)
}

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
  const positionsWithEntropy = Object.keys(field).map(key => {
    const possibilities = field[key]
    const position = keyToPosition(key)
    const variants = new Set(possibilities.map(p => p.variant)).size
    const entropy = variants <= 1 ? 0 : possibilities.length // TODO
    return [position, entropy]
  })
    .filter(([_, entropy]) => entropy > 0)
    .sort(([position1, entropy1], [position2, entropy2]) => entropy1 === entropy2 ? Math.random() - 0.5 : entropy1 - entropy2)
  // console.log(positionsWithEntropy)
  // Returns positions
  return positionsWithEntropy.map(([position, _]) => position)
}

function lowestPossibilityEntropyPosition(field) {
  const positionsWithEntropy = Object.keys(field).map(key => {
    const possibilities = field[key]
    const position = keyToPosition(key)
    const entropy = possibilities.length <= 1 ? 0 : possibilities.length // TODO
    return [position, entropy]
  })
    .filter(([_, entropy]) => entropy > 0)
    .sort(([position1, entropy1], [position2, entropy2]) => entropy1 - entropy2)
  // Returns positions
  return positionsWithEntropy.map(([position, _]) => position)
}

function collapseFieldFromRandomPosition(initialField, entropyFn) {
  // TODO
}

function collapseField(initialField, collapseFieldOnPosition, entropyFn) {
  const fieldSize = Object.keys(initialField).length
  let currentField = initialField;
  let history = []
  for (let iteration = 0; iteration < fieldSize; iteration += 1) {
    const positionsByEntropy = entropyFn(currentField)
    if (positionsByEntropy.length === 0) {
      break;
    }
    const possibilitiesByEntropy = positionsByEntropy.map(position =>
      currentField[positionToKey(position)]
        .slice()
        .sort(() => Math.random() - 0.5)
        .map(possibility => [position, possibility])
    ).reduce((a, b) => a.concat(b), [])
    let chosenPosition = null
    let chosenPossibility = null
    let backtracks = 0;
    for (backtracks; backtracks < possibilitiesByEntropy.length; backtracks += 1) {
      chosenPosition = possibilitiesByEntropy[backtracks][0]
      chosenPossibility = possibilitiesByEntropy[backtracks][1]
      // console.log("Collapsing:", chosenPosition, chosenPossibility)
      const collapsedField = collapseFieldOnPosition(currentField, chosenPosition, chosenPossibility)
      if (validField(collapsedField)) {
        currentField = freeze(collapsedField)
        history.push({ field: currentField, position: chosenPosition })
        console.log(`Collapsed ${fieldSize + 1 - positionsByEntropy.length} / ${fieldSize} on ${positionToKey(chosenPosition)}`)
        break;
      } else {
        console.log("Did not collapse to a valid field. Backtracking...")
        history.push({ field: collapsedField, position: chosenPosition })
        history.forEach(({ field, position }) => {
          debugField(field, position)
        })
      }
    }
    if (backtracks === possibilitiesByEntropy.length) {
      console.warn("Could not backtrack.")
      break
    }
    // debugField(currentField, chosenPosition)
  }

  if (entropyFn(currentField).length !== 0) {
    throw new Error("Field was not fully collapsed!")
  } else {
    console.log("Field fully collapsed.")
    // debugField(currentField)
  }
  return freeze(currentField);
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

function fullyCollapseFieldOnPosition(field, position, possibility) {
  let currentField = {
    ...field,
    [positionToKey(position)]: [possibility]
  }
  const positionsToVisit = [position]

  // Propagation
  function propagateStep(field, position) {
    const neighboursToPropagate = neighbouringPositions(field, position)
    let currentField = field
    // console.debug(`Visiting position`, positionToKey(position))
    // console.debug(`Propagating to ${neighboursToPropagate.length} neighbours.`, neighboursToPropagate)
    neighboursToPropagate.forEach(neighbour => {
      const edge = neighbourEdge(position, neighbour)
      const reverseEdge = neighbourEdge(neighbour, position)
      const possibilities = currentField[positionToKey(position)]
      const neighbourPossibilities = currentField[positionToKey(neighbour)]
      const validPossibilities = possibilities.filter(p => neighbourPossibilities.some(np => validNeighbourPossibility(np, reverseEdge, p)))
      const validNeighbourPossibilities = neighbourPossibilities.filter(np => possibilities.some(p => validNeighbourPossibility(p, edge, np)))
      // console.debug(`Propagating alongside edge ${edge}: ${positionToKey(position)} -> ${positionToKey(neighbour)}`)
      // console.debug(`And reverse edge ${reverseEdge}: ${positionToKey(neighbour)} -> ${positionToKey(position)}`)
      if (validPossibilities.length < possibilities.length || validNeighbourPossibilities.length < neighbourPossibilities.length) {
        // console.debug("Found changes", validPossibilities, neighbourPossibilities)
        currentField = {
          ...currentField,
          [positionToKey(position)]: validPossibilities,
          [positionToKey(neighbour)]: validNeighbourPossibilities
        }
        if (validPossibilities.length < possibilities.length) {
          positionsToVisit.push(position)
        }
        if (validNeighbourPossibilities.length < neighbourPossibilities.length) {
          positionsToVisit.push(neighbour)
        }
      } else {
        // console.debug("No changes")
      }
      // debugField(currentField, position, neighbour)
    })

    return currentField
  }

  while (positionsToVisit.length > 0) {
    currentField = propagateStep(currentField, positionsToVisit.shift())
  }
  // Returns field
  return currentField
}

function collapseFieldToSingleVariantOnPosition(field, position, possibility) {
  const possibilities = field[positionToKey(position)].filter(p => p.variant === possibility.variant)
  const collapsedFields = possibilities.map(p => fullyCollapseFieldOnPosition(field, position, p))
  // Returns field
  return collapsedFields.reduce((field1, field2) => mergeFields(field1, field2))
}

function mergeFields(field1, field2) {
  // return field1
  const resultField = {}
  Object.keys(field1).map(key => {
    const possibilities1 = field1[key]
    const possibilities2 = field2[key]
    const variants1 = new Set(possibilities1.map(p => p.variant))
    const variants2 = new Set(possibilities2.map(p => p.variant))
    const commonVariants = intersection(variants1, variants2)
    const commonPossibilitiesSet = new Set()
    const commonPossibilities = []
    possibilities1.filter(p => commonVariants.has(p.variant)).forEach(p => {
      // if (!commonPossibilitiesSet.has(possibilityToKey(p))) {
      commonPossibilitiesSet.add(possibilityToKey(p))
      commonPossibilities.push(p)
      // }
    })
    possibilities2.filter(p => commonVariants.has(p.variant)).forEach(p => {
      if (!commonPossibilitiesSet.has(possibilityToKey(p))) {
        commonPossibilitiesSet.add(possibilityToKey(p))
        commonPossibilities.push(p)
      }
    })
    resultField[key] = commonPossibilities
  })
  // Returns field
  return resultField
}

function possibilityToKey(possibility) {
  return JSON.stringify(possibility)
}

function intersection(setA, setB) {
  let _intersection = new Set()
  for (let elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem)
    }
  }
  return _intersection
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
    // drawField(state.field)
  }
  console.timeEnd('draw')
}

function drawTransition(startTiles_, endTiles_, done) {
  const startTiles = startTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))
  const endTiles = endTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))

  const firstFrameAt = performance.now()
  const tileDelay = 100 // ms
  const tileAnimationLength = 500 // ms
  const animationLength = tileAnimationLength * 5
  function drawAnimationFrame(timestamp) {
    // console.log("Animation frame")
    const timeProgress = clamp(0, animationLength, timestamp - firstFrameAt)
    const progress = timeProgress / animationLength

    if (progress <= 1) {
      clearCanvas()
      for (let i = 0; i < endTiles.length; i += 1) {
        const startTile = startTiles[i]
        const endTile = endTiles[i]
        const tileDistanceFromCenter = Math.max(...endTile.position.map(coordinate => Math.abs(coordinate)))
        const tileProgress = clamp(0, 1, (timeProgress - tileDistanceFromCenter * tileDelay) / tileAnimationLength)
        let edgeDiff = (endTile.topEdge - startTile.topEdge) % EDGES
        if (Math.abs(edgeDiff) > EDGES / 2) edgeDiff -= Math.sign(edgeDiff) * EDGES // Always choose the shortest rotation
        const angle = (1 - tileProgress) * (edgeDiff / EDGES) * 2 * Math.PI
        // console.log("Rotating tile", endTile.topEdge, startTile.topEdge, edgeDiff, angle)
        drawTile(endTile, angle)
      }

      if (progress < 1) {
        requestAnimationFrame(drawAnimationFrame)
      }
    } else {
      done()
    }
  }

  console.log("Drawing transition...")
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
  ctx.fillStyle = '#f3fafb'
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
    drawHexagon(tileCenter, tileEdges, clamp(0.01, 1.0, tileRadius / 8), 0)
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
  const sidesExtent = 0.999
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
    const startTiles = state.tiles
    const collapsedField = collapseField(state.field, fullyCollapseFieldOnPosition, lowestPossibilityEntropyPosition)
    const endTiles = collapsedFieldToTiles(collapsedField)
    drawTransition(startTiles, endTiles, () => {
      state.tiles = endTiles
    })
  } else {
    // Initial tiles
    const initialField = fullField(Object.keys(VARIANTS_TO_EDGES), POSITIONS)
    const field = collapseField(initialField, collapseFieldToSingleVariantOnPosition, lowestVariantEntropyPosition)
    // debugField(field)
    const collapsedField = collapseField(field, fullyCollapseFieldOnPosition, lowestPossibilityEntropyPosition)
    const tiles = collapsedFieldToTiles(collapsedField)
    state.field = field
    // state.field = {}
    state.tiles = tiles
    draw()
  }
}

function test() {
  console.log("Test started")
  const tests = 100;
  for (let i = 1; i <= tests; i += 1) {
    console.log(`Test ${i} / ${tests}`)
    restart()
  }
  console.log("Test ended")
}
restart();
