const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = Math.max(Math.floor(document.body.clientWidth / 10), Math.floor(document.body.clientHeight) / 10) // 200;
const tileRadius = 0.5
let DEBUG = false;

const COLOR0 = "0"
const COLOR1 = "1"
const COLOR2 = "2"
const COLOR3 = "3"
const COLOR4 = "4"

const EDGES = 6

const COLORS = [COLOR1, COLOR3]

const allEdges = COLORS.map(c1 => COLORS.map(c2 => COLORS.map(c3 => COLORS.map(c4 => COLORS.map(c5 => COLORS.map(c6 => [c1, c2, c3, c4, c5, c6])))))).flat(5)

const ALL_VARIANTS_TO_EDGES = allEdges.reduce((acc, edges) => {
  const newEdges = rangeInclusive(0, EDGES - 1).map(edge => rotateEdges(edges, edge)).map(edges => edges.join('')).every(key => !acc[key])
  const sameEdges = new Set(edges).size === 1
  const emptyEdges = edges.filter(color => color === COLOR0).length
  const edgesCount = Object.values(edges.reduce((acc, color) => color === COLOR0 ? acc : { ...acc, [color]: (acc[color] || 0) + 1 }, {}))
  const pairedEdges = edgesCount.every(count => count > 1)
  const tripledEdges = edgesCount.every(count => count > 1)
  // console.log(edges.join(''), pairedEdges, edgesCount)
  const accepted = newEdges && !sameEdges && emptyEdges < 3 && pairedEdges && edgesCount.length === 2
  if (accepted) {
    return {
      ...acc,
      [edges.join('')]: edges
    }
  } else {
    return acc
  }
}, {})
console.log("Variants count:", Object.keys(ALL_VARIANTS_TO_EDGES).length)

const EMPTY_POSSIBILITY = { variant: '000000', topEdge: 0 }

const VARIANTS_TO_EDGES = {
  // ...ALL_VARIANTS_TO_EDGES,
  //'113311': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR1, COLOR1],
  // '113331': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR3, COLOR1],
  // '111131': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR3, COLOR1],
  // '131131': [COLOR1, COLOR3, COLOR1, COLOR1, COLOR3, COLOR1],
  '144141': [COLOR1, COLOR4, COLOR4, COLOR1, COLOR4, COLOR1],
  '244242': [COLOR2, COLOR4, COLOR4, COLOR2, COLOR4, COLOR2],
  '133131': [COLOR1, COLOR3, COLOR3, COLOR1, COLOR3, COLOR1],
  '233232': [COLOR2, COLOR3, COLOR3, COLOR2, COLOR3, COLOR2],
  // '133113': [COLOR1, COLOR3, COLOR3, COLOR1, COLOR1, COLOR3],
  // [EMPTY_POSSIBILITY.variant]: [COLOR0, COLOR0, COLOR0, COLOR0, COLOR0, COLOR0]
}

const DRAWN_VARIANTS_TO_EDGES = {
  ...VARIANTS_TO_EDGES
}
/*
const VARIANTS_TO_EDGES = {
  '001122': [COLOR0, COLOR0, COLOR1, COLOR1, COLOR2, COLOR2],
  '002233': [COLOR0, COLOR0, COLOR2, COLOR2, COLOR3, COLOR3],
  '003311': [COLOR0, COLOR0, COLOR3, COLOR3, COLOR1, COLOR1],
  '100110': [COLOR1, COLOR0, COLOR0, COLOR1, COLOR1, COLOR0],
  //'111111': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR1, COLOR1],
  //'112111': [COLOR1, COLOR1, COLOR2, COLOR1, COLOR1, COLOR1],
  // '112211': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR1, COLOR1],
  // '112221': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR1],
  //'112222': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR2],
  //'122222': [COLOR1, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
  //'222222': [COLOR2, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
  //'121212': [COLOR1, COLOR2, COLOR1, COLOR2, COLOR1, COLOR2],
  //'112112': [COLOR1, COLOR1, COLOR2, COLOR1, COLOR1, COLOR2],
  // '112222': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR2, COLOR2],
  // '333333': [COLOR3, COLOR3, COLOR3, COLOR3, COLOR3, COLOR3],
  // '333111': [COLOR3, COLOR3, COLOR3, COLOR1, COLOR1, COLOR1],
  '113322': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR2, COLOR2],
  // '112244': [COLOR1, COLOR1, COLOR2, COLOR2, COLOR4, COLOR4],
  // '113344': [COLOR1, COLOR1, COLOR3, COLOR3, COLOR4, COLOR4],
  // '223344': [COLOR2, COLOR2, COLOR3, COLOR3, COLOR4, COLOR4],
  // '333222': [COLOR3, COLOR3, COLOR3, COLOR2, COLOR2, COLOR2],
  // '111222': [COLOR1, COLOR1, COLOR1, COLOR2, COLOR2, COLOR2],
  // '111111': [COLOR1, COLOR1, COLOR1, COLOR1, COLOR1, COLOR1],
  // '222111': [COLOR2, COLOR2, COLOR2, COLOR1, COLOR1, COLOR1],
  // '222222': [COLOR2, COLOR2, COLOR2, COLOR2, COLOR2, COLOR2],
}
*/

const span = rangeInclusive(-10, 10)
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

const edgesForVariantCache = new Map()
function edgesForVariant(variant, topEdge) {
  return edgesForVariantCache.get(variant)[topEdge]
}

// Preload edgesForVariant cache
Object.keys(DRAWN_VARIANTS_TO_EDGES).forEach(variant => {
  const edges = DRAWN_VARIANTS_TO_EDGES[variant]
  const edgesByTopEdge = rangeInclusive(0, EDGES - 1).map(topEdge => {
    return rotateEdges(edges, topEdge)
  })
  edgesForVariantCache.set(variant, edgesByTopEdge)
})

function rotateEdges(edges, topEdge) {
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
    const entropy = variants <= 1 ? 0 : variants // TODO
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

function generatePossibilityCollapseCandidates(field) {
  const positionsByEntropy = lowestPossibilityEntropyPosition(field)
  const possibilitiesByEntropy = positionsByEntropy.map(position =>
    field[positionToKey(position)]
      .slice()
      .sort(() => Math.random() - 0.5)
      .map(possibility => [position, possibility])
  ).reduce((a, b) => a.concat(b), [])
  return possibilitiesByEntropy.map(([position, possibility]) => ({ position, possibility }))
}

function generateVariantCollapseCandidates(field) {
  const positionsByEntropy = lowestVariantEntropyPosition(field)
  const variantsByEntropy = positionsByEntropy.map(position => {
    const variants = field[positionToKey(position)]
      .map(possibility => possibility.variant)
      .reduce((set, variant) => set.add(variant), new Set())
    return Array.from(variants)
      .sort(() => Math.random() - 0.5)
      .map(variant => [position, variant])
  }).reduce((a, b) => a.concat(b), [])
  return variantsByEntropy.map(([position, variant]) => ({ position, variant }))
}

function collapseFieldFromRandomPosition(initialField, entropyFn) {
  // TODO
}

function collapseField(initialField, collapseFieldOnCandidate, generateCollapseCandidates) {
  const fieldSize = Object.keys(initialField).length
  let currentField = initialField;
  let history = []
  for (let iteration = 0; iteration < fieldSize; iteration += 1) {
    const candidates = generateCollapseCandidates(currentField)
    console.log("Candidates count:", candidates.length)
    if (candidates.length === 0) {
      break;
    }
    let candidate = null
    let backtracks = 0;
    const maxBacktracks = candidates.length
    const alternativeLookahead = 0
    for (backtracks; backtracks < maxBacktracks; backtracks += 1) {
      candidate = candidates[backtracks]
      // const variants = currentField[positionToKey(candidate.position)].filter(p => p.variant === candidate.variant)
      // console.log(variants.length)
      // console.log("Collapsing:", candidate.position, candidate.possibility)
      const collapsedField = collapseFieldOnCandidate(currentField, candidate)
      if (validField(collapsedField)) {
        const entropy = Object.values(collapsedField).filter(p => p.length > EDGES).map(p => p.length).reduce((a, b) => a + b, 0)
        currentField = freeze(collapsedField)
        history.push({ field: currentField, position: candidate.position })
        console.log(`Collapsed ${iteration} / ${fieldSize} on ${positionToKey(candidate.position)}. Entropy: ${entropy}`)
        break;
      } else {
        console.log("Did not collapse to a valid field. Backtracking...")
        history.push({ field: collapsedField, position: candidate.position })
        history.forEach(({ field, position }) => {
          // debugField(field, position)
        })
      }
    }
    if (backtracks >= maxBacktracks) {
      console.warn("Could not backtrack.")
      break
    }
    // debugField(currentField)
  }

  const remainingCandidates = generateCollapseCandidates(currentField)
  if (remainingCandidates.length !== 0) {
    throw new Error(`Field was not fully collapsed! ${remainingCandidates.length} candidates remain.`)
  } else {
    console.log("Field fully collapsed.")
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

function validNeighbourColor(color, neighbourColor) {
  // return true
  // return color === neighbourColor
  // return (color === COLOR0 && neighbourColor === COLOR0) || (color !== COLOR0 && neighbourColor !== COLOR0)
  // return color === COLOR0 || neighbourColor === COLOR0 || color === neighbourColor
  return color === neighbourColor ||
    (color === COLOR1 && neighbourColor === COLOR2) ||
    (color === COLOR2 && neighbourColor === COLOR1) ||
    (color === COLOR3 && neighbourColor === COLOR4) ||
    (color === COLOR4 && neighbourColor === COLOR3)
}

function filterValidPossibilities(possibilities, edge, neighbourPossibilities) {
  const reverseEdge = oppositeEdge(edge)
  const neighbourColors = Array.from(new Set(neighbourPossibilities.map(possibility =>
    edgesForVariant(possibility.variant, possibility.topEdge)[reverseEdge]
  )))
  return possibilities.filter(possibility => {
    const color = edgesForVariant(possibility.variant, possibility.topEdge)[edge]
    return neighbourColors.some(neighbourColor => validNeighbourColor(color, neighbourColor))
  })
}

function fullyCollapseFieldOnPosition(field, { position, possibility }) {
  let currentField = {
    ...field,
    [positionToKey(position)]: [possibility]
  }
  let positionsToVisit = [position]

  while (positionsToVisit.length > 0) {
    const { field, positionsToVisit: newPositionsToVisit } = propagateStep(currentField, positionsToVisit.shift())
    currentField = field
    positionsToVisit = positionsToVisit.concat(newPositionsToVisit)
  }
  // Returns field
  return currentField
}

// Propagation
function propagateStep(field, position) {
  const positionsToVisit = []
  // console.debug("PROPAGATING", field, position)
  const neighboursToPropagate = neighbouringPositions(field, position)
  let currentField = field
  // console.debug(`Visiting position`, positionToKey(position))
  // console.debug(`Propagating to ${neighboursToPropagate.length} neighbours.`, neighboursToPropagate)
  neighboursToPropagate.forEach(neighbour => {
    const edge = neighbourEdge(position, neighbour)
    const reverseEdge = neighbourEdge(neighbour, position)
    const possibilities = currentField[positionToKey(position)]
    const neighbourPossibilities = currentField[positionToKey(neighbour)]
    // console.log(possibilities.length, neighbourPossibilities.length)
    const validPossibilities = filterValidPossibilities(possibilities, edge, neighbourPossibilities)
    const validNeighbourPossibilities = filterValidPossibilities(neighbourPossibilities, reverseEdge, possibilities)
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

  return { field: currentField, positionsToVisit }
}

function collapseFieldToSingleVariantOnPosition(field, { position, variant }) {
  const possibilities = field[positionToKey(position)].filter(p => p.variant === variant)
  const collapsedFields = possibilities.map(possibility => fullyCollapseFieldOnPosition(field, { position, possibility }))
  // Returns field
  return collapsedFields.reduce((field1, field2) => mergeFields(field1, field2), field)
}

function mergeFields(field1, field2) {
  // return field1
  const resultField = {}
  Object.keys(field1).map(key => {
    const possibilities1 = field1[key]
    const possibilities2 = field2[key]
    if (possibilities1 === possibilities2) {
      // console.log("Performance optimization: possibilities haven't changed.")
      resultField[key] = possibilities1
      return
    }
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
  return `${possibility.variant}:${possibility.topEdge}`
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
  field: {},
  transitioning: false
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
  const clickCoordinates = {
    x: invertX(event.x),
    y: invertY(event.y)
  }
  restart(clickCoordinates);
}

// Drawing
const backgroundColor = '#fadcaa';
const edgeColors = {
  [COLOR0]: 'transparent',
  [COLOR1]: '#794c74',// '#111',
  [COLOR2]: '#c56183',// '#222',
  [COLOR3]: '#f8ce87',//'#ccc',
  [COLOR4]: '#f7c56e'// '#ddd'
}

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

function drawTransition(startTiles_, endTiles_, clickCoordinates, done) {
  const startTiles = startTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))
  const endTiles = endTiles_.sort((a, b) => positionToKey(a.position).localeCompare(positionToKey(b.position)))

  const firstFrameAt = performance.now()
  const tileDelay = 250 // ms
  const edgeTurnAnimationLength = 500 // ms
  function drawAnimationFrame(timestamp) {
    console.log("Animation frame")
    let animating = false

    clearCanvas()
    for (let i = 0; i < endTiles.length; i += 1) {
      const startTile = startTiles[i]
      const endTile = endTiles[i]
      const tileDistance = distance2d(clickCoordinates, hexTo2d(endTile.position))
      let edgeTurns = (endTile.topEdge - startTile.topEdge) % EDGES
      if (Math.abs(edgeTurns) > EDGES / 2) edgeTurns -= Math.sign(edgeTurns) * EDGES // Always choose the shortest rotation
      const tileAnimationStart = firstFrameAt + tileDistance * tileDelay;
      const tileAnimationLength = Math.abs(edgeTurns) * edgeTurnAnimationLength
      const tileProgress = clamp(0, 1, (timestamp - tileAnimationStart) / tileAnimationLength)
      // const easedTileProgress = easeOutElastic(tileProgress)
      const easedTileProgress = easeInOutBack(tileProgress)
      // console.debug(firstFrameAt, tileAnimationStart, timestamp)
      const angle = (1 - easedTileProgress) * (edgeTurns / EDGES) * 2 * Math.PI
      // console.debug("Rotating tile progress", edgeTurns, tileProgress, easedTileProgress)
      drawTile(endTile, angle)
      if (tileProgress < 1) {
        animating = true
      }
    }

    if (animating) {
      requestAnimationFrame(drawAnimationFrame)
    } else {
      console.log("Done animating.")
      done()
    }
  }

  console.log("Drawing transition...")
  requestAnimationFrame(drawAnimationFrame)

  clearCanvas()
  state.tiles.forEach(tile => {
    drawTile(tile)
  })
}

// https://easings.net/#easeOutElastic
function easeOutElastic(x) {
  const c4 = (2 * Math.PI) / 2;
  return x === 0
    ? 0
    : x === 1
      ? 1
      : Math.pow(5, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;

}

// https://easings.net/#easeInOutBack
function easeInOutBack(x) {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;

  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;

}

function clearCanvas() {
  ctx.save();
  ctx.fillStyle = backgroundColor
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
    ctx.fillText(positionToKey(position) + " (" + possibilities.length + ")", x(center.x), y(center.y))
    ctx.restore()
  })

}

function drawFieldPossibilities(position, possibilities) {
  ctx.save()

  const center = hexTo2d(position)
  const allPossibilitiesCount = Object.keys(DRAWN_VARIANTS_TO_EDGES).length * EDGES
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

  drawSmoothHexagon(center, rotatedEdges, tileRadius * 1.20, rotationAngle)
}

function drawHexagon(center, edges, radius, rotationAngle) {
  const centerEdgeColor1 = edges.filter(c => c === COLOR1 || c === COLOR2)[0]
  const centerEdgeColor2 = edges.filter(c => c === COLOR3 || c === COLOR4)[0]
  const centerEdgeColor = Math.floor(center.x + center.y) % 2 === 0 ? centerEdgeColor1 : centerEdgeColor2
  const centerColor = edgeColors[centerEdgeColor]//backgroundColor
  const sidesExtent = 0.5
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
    const edgeColor = edgeColors[color] || color

    ctx.save();
    ctx.beginPath()
    ctx.moveTo(x(startPoint.x), y(startPoint.y))
    ctx.lineTo(x(endPoint.x), y(endPoint.y))
    ctx.lineTo(x(endBottomPoint.x), y(endBottomPoint.y))
    ctx.lineTo(x(startBottomPoint.x), y(startBottomPoint.y))
    ctx.closePath()
    ctx.fillStyle = edgeColor
    ctx.strokeStyle = edgeColor // "#333"
    ctx.fill()
    ctx.stroke()
    ctx.restore();
    // debugger;
  })

  ctx.restore();
}

function drawSmoothHexagon(center, edges, radius, rotationAngle) {
  // const topColors = Math.floor(center.x + center.y) % 2 === 0 ? '1234' : '3412'
  const topColors = '4321'
  const uniqueColors = Array.from(new Set(edges)).sort((a, b) => topColors.indexOf(a) - topColors.indexOf(b))
  const centerEdgeColor = Math.floor(center.x + center.y) % 2 === 0 ? uniqueColors[0] : uniqueColors[1]
  const sidesExtent = 0.5
  ctx.save();
  uniqueColors.slice().reverse().forEach(drawnColor => {
    let path = []
    edges.forEach((color, rotation) => {
      const angleStart = rotationAngle + (rotation - 0.5) / EDGES * 2 * Math.PI;
      const angleEnd = rotationAngle + (rotation + 0.5) / EDGES * 2 * Math.PI;

      const topPoint = { x: center.x, y: center.y + radius }
      const bottomPoint = { x: center.x, y: center.y + radius * (1 - sidesExtent) }
      const startBottomPoint = rotateClockwise(bottomPoint, center, angleStart)
      const endBottomPoint = rotateClockwise(bottomPoint, center, angleEnd)

      const previousColor = edges[(rotation - 1 + EDGES) % EDGES]
      const nextColor = edges[(rotation + 1) % EDGES]
      if (color === drawnColor) {
        const startPoint = rotateClockwise(topPoint, center, angleStart)
        const endPoint = rotateClockwise(topPoint, center, angleEnd)
        // ctx.lineTo(x(startPoint.x), y(startPoint.y))
        //ctx.lineTo(x(endPoint.x), y(endPoint.y))
        path.push({ type: 'line', start: startPoint, end: endPoint })
      } else if (nextColor === drawnColor && previousColor === drawnColor) {
        const arcCenter = rotateClockwise({ x: center.x, y: center.y + radius * (2 / Math.sqrt(3)) }, center, rotationAngle + (rotation / EDGES * 2 * Math.PI), true)
        const angleStart = rotationAngle + (rotation + 2.5) / EDGES * 2 * Math.PI
        const angleEnd = rotationAngle + (rotation + 0.5) / EDGES * 2 * Math.PI
        path.push({ type: 'arc', center: arcCenter, radius: radius * (1 / Math.sqrt(3)), angleStart, angleEnd })
        /*
        ctx.save()
        ctx.beginPath()
        ctx.arc(x(arcCenter.x), y(arcCenter.y), 10, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fillStyle = edgeColors[drawnColor]
        ctx.fill()
        ctx.restore()
        */
      } else if (previousColor === drawnColor && nextColor !== drawnColor) {
        // skip
      } else if (previousColor !== drawnColor && nextColor === drawnColor) {
        const arcCenter = rotateClockwise({ x: center.x, y: center.y + radius * 2 }, center, rotationAngle + ((rotation - 0.5) / EDGES * 2 * Math.PI), true)
        const angleStart = rotationAngle + (rotation + 1.5) / EDGES * 2 * Math.PI
        const angleEnd = rotationAngle + (rotation + 0.5) / EDGES * 2 * Math.PI
        path.push({ type: 'arc', center: arcCenter, radius: radius * Math.sqrt(3), angleStart, angleEnd })
        /*
        ctx.save()
        ctx.beginPath()
        ctx.arc(x(arcCenter.x), y(arcCenter.y), 10, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fillStyle = edgeColors[drawnColor]
        ctx.fill()
        ctx.restore()
        */
      } else {
        // ctx.lineTo(x(startBottomPoint.x), y(startBottomPoint.y))
        // ctx.lineTo(x(endBottomPoint.x), y(endBottomPoint.y))
        path.push({ type: 'line', start: startBottomPoint, end: endBottomPoint })
      }
      // ctx.lineTo(x(endBottomPoint.x), y(endBottomPoint.y))
      // ctx.lineTo(x(startBottomPoint.x), y(startBottomPoint.y))
    })

    ctx.save();
    ctx.beginPath()
    path.forEach(segment => {
      if (segment.type === 'line') {
        ctx.lineTo(x(segment.start.x), y(segment.start.y))
        ctx.lineTo(x(segment.end.x), y(segment.end.y))
      } else if (segment.type === 'arc') {
        ctx.arc(x(segment.center.x), y(segment.center.y), scale(segment.radius), segment.angleStart, segment.angleEnd, true)
      }
    })
    const edgeColor = edgeColors[drawnColor]
    ctx.closePath()
    ctx.fillStyle = edgeColor
    ctx.strokeStyle = edgeColor // "#333"
    // ctx.lineWidth = 1
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

function distance2d({ x: x1, y: y1 }, { x: x2, y: y2 }) {
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

function restart(clickCoordinates = { x: 0, y: 0 }) {
  if (state.transitioning) {
    console.log("Ignored restart during transition.")
    return
  }

  if (state.tiles.length > 0) {
    // Transition
    const startTiles = state.tiles
    const collapsedField = collapseField(state.field, fullyCollapseFieldOnPosition, generatePossibilityCollapseCandidates)
    const endTiles = collapsedFieldToTiles(collapsedField)
    state.transitioning = true
    drawTransition(startTiles, endTiles, clickCoordinates, () => {
      state.tiles = endTiles
      state.transitioning = false
    })
  } else {
    // Initial tiles
    const initialField = fullField(Object.keys(VARIANTS_TO_EDGES), POSITIONS)
    const field = collapseField(initialField, collapseFieldToSingleVariantOnPosition, generateVariantCollapseCandidates)
    // debugField(field)
    const collapsedField = collapseField(field, fullyCollapseFieldOnPosition, generatePossibilityCollapseCandidates)
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

// {"[-1,0,1]":[{"variant":"112211","topEdge":2},{"variant":"112211","topEdge":1},{"variant":"112211","topEdge":3},{"variant":"112211","topEdge":4},{"variant":"112211","topEdge":5},{"variant":"112211","topEdge":0}],"[-1,1,0]":[{"variant":"112211","topEdge":0},{"variant":"112211","topEdge":1},{"variant":"112211","topEdge":5},{"variant":"112211","topEdge":3},{"variant":"112211","topEdge":4},{"variant":"112211","topEdge":2}],"[0,-1,1]":[{"variant":"112211","topEdge":0},{"variant":"112211","topEdge":5},{"variant":"112211","topEdge":4},{"variant":"112211","topEdge":3},{"variant":"112211","topEdge":1},{"variant":"112211","topEdge":2}],"[0,0,0]":[{"variant":"122222","topEdge":3},{"variant":"122222","topEdge":5},{"variant":"122222","topEdge":1},{"variant":"122222","topEdge":2},{"variant":"122222","topEdge":0},{"variant":"122222","topEdge":4}],"[0,1,-1]":[{"variant":"112211","topEdge":0},{"variant":"112211","topEdge":5},{"variant":"112211","topEdge":1},{"variant":"112211","topEdge":2},{"variant":"112211","topEdge":3},{"variant":"112211","topEdge":4}],"[1,-1,0]":[{"variant":"122222","topEdge":2},{"variant":"122222","topEdge":0},{"variant":"122222","topEdge":3},{"variant":"122222","topEdge":4},{"variant":"122222","topEdge":5},{"variant":"122222","topEdge":1}],"[1,0,-1]":[{"variant":"122222","topEdge":0},{"variant":"122222","topEdge":4},{"variant":"122222","topEdge":5},{"variant":"122222","topEdge":1},{"variant":"122222","topEdge":2},{"variant":"122222","topEdge":3}]}
