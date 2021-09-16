const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const unitLength = 200

let DEBUG = true;

const state = {
  backgroundColor: '#000'
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

function pointCloseTo(point1, point2, distance) {
  return distance2d(point1, point2) < distance
}

function circlePack(numCircles, initialCircles, extent = 2, minNeighbors = 1, maxNeighbors = Infinity) {
  const circles = []
  const allCircles = initialCircles
  const minGap = 0.18
  const maxGap = 0.25
  let iterations = 0
  for (let i = 0; i < numCircles;) {
    iterations += 1
    const x = extent * 3 * (Math.random() - 0.5)
    const y = extent * 2 * (Math.random() - 0.5)
    const radius = 0.1 + Math.random() * 0.05
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

const circleZ = { position: { x: 0 + (Math.random() - 0.5) * 0.2, y: 1.2 }, radius: 0.5 }
const circleX = { position: { x: 0, y: 0 }, radius: 0.5 }
const circleY = { position: { x: 0 + (Math.random() - 0.5) * 0.2, y: -1.2 }, radius: 0.5 }

const seed = Math.random()

const circles = circlePack(3 * 30, [circleZ, circleX, circleY]).map((circle, i) => {
  const text = i % 3 === 0 ? "Z" : i % 3 === 1 ? "X" : "Y"

  return {
    text,
    position: circle.position,
    radius: circle.radius
  }
})

// Drawing
function draw({ z, x, y }) {
  if (DEBUG) {
    // console.log("DRAWING", scene);
  }
  const colorZ = d3.hsl(0, 0.75, 0.75)
  const colorX = d3.hsl(120, 0.75, 0.75)
  const colorY = d3.hsl(210, 0.75, 0.75)

  // Clear canvas
  clearCanvas({ z, x, y })

  circles.forEach(circle => {
    let value = 0;
    let color = null
    switch (circle.text) {
      case "Z": {
        value = z;
        color = colorZ
        break
      }
      case "Y": {
        value = y;
        color = colorY
        break
      }
      case "X": {
        value = x;
        color = colorX
        break
      }
    }
    drawCircle(circle.position, circle.radius, value, color, '')
  })
  drawCircle(circleZ.position, circleZ.radius, z, d3.hsl(0, 0.75, 0.75), "Z")
  drawCircle(circleX.position, circleX.radius, x, d3.hsl(120, 0.75, 0.75), "X")
  drawCircle(circleY.position, circleY.radius, y, d3.hsl(210, 0.75, 0.75), "Y")
}

function drawCircle(position, radius, value, color, text) {
  const darker = color.brighter(0.5)
  ctx.save()

  ctx.beginPath()
  ctx.arc(x(position.x), y(position.y), scale(radius), 0, 2 * Math.PI)
  ctx.fillStyle = color.brighter(0.75).formatHex()
  ctx.fill()
  ctx.closePath()

  ctx.beginPath()
  // ctx.arc(x(position.x - (1 - value) * 3.5), y(position.y), scale(radius * Math.sqrt(value)), 0, 2 * Math.PI)
  ctx.arc(x(position.x), y(position.y), scale(radius * Math.sqrt(value)), 0, 2 * Math.PI)
  ctx.fillStyle = color.formatHex()
  ctx.fill()
  ctx.closePath()

  ctx.beginPath()
  ctx.arc(x(position.x), y(position.y), scale(radius), 0, 2 * Math.PI)
  ctx.strokeStyle = darker.formatHex()
  ctx.lineWidth = Math.ceil(scale(radius * 0.05))
  // ctx.stroke()
  ctx.closePath()


  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${scale(radius * 0.5)}px sans-serif`
  ctx.fillStyle = darker.formatHex()
  // ctx.fillText(text, x(position.x), y(position.y))

  ctx.restore()
}

function clearCanvas({ z, x, y }) {
  ctx.save();
  ctx.fillStyle = d3.hsl((z + x + y) / 3 * 40 + seed * 360, 0.5, 0.8).formatHex()
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


adjustCanvasSize();
window.addEventListener('resize', () => adjustCanvasSize());
// window.addEventListener('resize', () => draw());
canvas.addEventListener('click', handleCanvasClick);

function restart() {
}

restart();

class Signal {
  constructor(name) {
    this.name = name
    this.value = 0;
  }

  // 0..1
  getValue() {
    return this.value
  }

  setValue(value) {
    this.value = value
  }
}

let gateOn = false

Signal.fromNoteGate = function (midiInput) {
  const signal = new Signal("note gate")
  midiInput.addListener("noteon", "all", (msg) => {
    signal.setValue(1)
  })
  midiInput.addListener("noteoff", "all", (msg) => {
    // console.log("noteoff gate")
    signal.setValue(0)
    gateOn = false
  })
  return signal
}

Signal.fromNotePitch = function (midiInput, min = 0, max = 127) {
  const signal = new Signal("note pitch")
  midiInput.addListener("noteon", "all", (msg) => {
    const value = (clamp(min, max, msg.note.number) - min) / (max - min)
    //console.log(msg.note.number, value)
    signal.setValue(value)
  })
  midiInput.addListener("noteoff", "all", (msg) => {
    // console.log("noteoff")
    signal.setValue(0)
  })
  return signal
}

Signal.fromControlChange = function (midiInput, ccNumber, stiffness = 1) {
  const signal = new Signal("cc")
  const continuous = new Continuous(stiffness)
  const min = 0
  // const max = 127 // 7 bit
  const max = 16384 // 14 bit
  let fine = 0;
  let coarse = 0;
  midiInput.addListener("controlchange", "all", (msg) => {
    if (msg.controller.number === ccNumber) {
      coarse = msg.value
    } else if (msg.controller.number === ccNumber + 32) {
      fine = msg.value
      const value = (clamp(min, max, coarse * 128 + fine) - min) / (max - min)
      continuous.setValue(value)
    }
  })
  return {
    getValue() {
      if (isNaN(continuous.value())) {
        console.log(continuous)
        // debugger
      }
      return continuous.value()
    }
  }
}

Signal.smooth = function (signal) {
}

WebMidi.enable(function (err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err);
  } else {
    console.log("WebMidi enabled! " + WebMidi.inputs.length + " inputs.");
    const midiInput = WebMidi.inputs[0]
    // const gate = Signal.fromNoteGate(midiInput)
    // const pitch = Signal.fromNotePitch(midiInput, 50, 80)
    const ccZ = Signal.fromControlChange(midiInput, 1, 1)
    const ccX = Signal.fromControlChange(midiInput, 2, 1)
    const ccY = Signal.fromControlChange(midiInput, 3, 1)

    function drawFrame() {
      draw({
        z: ccZ.getValue(),
        x: ccX.getValue(),
        y: ccY.getValue()
      })
      requestAnimationFrame(drawFrame)
    }
    requestAnimationFrame(drawFrame)
  }
});
