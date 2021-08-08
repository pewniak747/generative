// https://raw.githubusercontent.com/lucidogen/lucy-util/master/lib/Continuous.js

/*
  # Continuous

  Transform a discrete progression into a continous  ( time
  based ) value.

  An important parameter is the 'spring' stiffness. A hard 'spring' of `1.0`
  means that 'follower' (what we read) values are glued to the attractor (what
  we set). Reduced stiffness means smoother values and less jitter.

  Currently, if the 'attractor' value jumps back, we move the 'follower' value
  directly.

*/
'use strict'

let TIME_SOURCE

if (window) {
  TIME_SOURCE = window.performance
}
else {
  TIME_SOURCE = Date
}

const now =
  function () {
    return TIME_SOURCE.now() / 1000
  }

const ref = now()

const elapsed = function () {
  return now() - ref
}

// Return the current beat value.
const getValue = function (gtime) {
  if (this._stopped) return this._follower.value
  gtime = gtime || elapsed()
  let attractor = this._attractor
  let follower = this._follower

  // Update attractor position.
  let dt = gtime - attractor.gtime
  // attractor.value += attractor.speed * dt
  attractor.gtime = gtime

  // Update force between attractor and follower.
  dt = gtime - follower.gtime
  let fpos = follower.value + follower.speed * dt

  // a stiffness of 1 == direct jump to attractor position.
  let force = (attractor.value - fpos) * attractor.stiffness

  follower.speed += force / dt
  follower.value += follower.speed * dt
  follower.speed *= 0.99 // friction
  if (isNaN(follower.value)) {
    debugger
  }
  if (follower.speed > 0 && follower.value > attractor.value) {
    follower.value = attractor.value
  }
  if (follower.speed < 0 && follower.value < attractor.value) {
    follower.value = attractor.value
  }

  return follower.value
}

// This method is called by the discrete counter to set current value. Optional
// `rtime` can be used to set current reference time. Default is elapsed ().
const setValue = function (value, rtime) {
  rtime = rtime || elapsed()
  let attractor = this._attractor

  let dt = rtime - attractor.ltime
  if (dt === 0) {
    // debugger
    return
  }

  /*
  if (value < attractor.lpos) { // we are jumping back. Move follower and attractor by jump amount
    let jump = value - (attractor.lpos + attractor.speed * dt)
    this._follower.value += jump
    attractor.value += jump
    attractor.lpos += jump
  }
  */

  attractor.speed = (value - attractor.lpos) / dt

  // reference
  attractor.lpos = value
  attractor.ltime = rtime

  // current attractor value
  attractor.value = value
  attractor.gtime = rtime

  if (isNaN(attractor.speed)) {
    // debugger
  }
}

const setFirstValue = function (value, rtime = elapsed()) {
  setValue.call(this, value, rtime)
  let follower = this._follower
  follower.value = value
  follower.gtime = rtime

  this.setValue = setSecondValue
}

const setSecondValue = function (value, rtime = elapsed()) {
  setFirstValue.call(this, value, rtime)
  // Now that we have a meaningful speed, let's use it.
  this._follower.speed = this._attractor.speed
  this.setValue = setValue
  this.value = getValue
}

const getFirstValues = function () {
  return this._follower.value
}

const Continuous = function (stiffness) {
  // Attractor with speed tracking
  this._attractor =
  {
    value: 0 // computed attractor position
    , speed: 0 // attractor speed from last set operation
    , gtime: 0 // attractor last 'get' time ref

    // attractor spring stiffness
    , stiffness: stiffness || 1
    , lpos: 0 // last reference position
    , ltime: 0 // last reference position time
  }

  // The value of the follower is what value () returns
  this._follower =
  {
    value: 0
    , speed: 0
    , gtime: 0 // last get reference time ( used to compute dt and
    // apply speed.
  }

  // Running status so that we just return 0 on value query
  // before speed and value are first set.
  this._stopped = null

  this.setValue = setFirstValue
  this.value = getFirstValues
}

// Move value forward `dv`.
Continuous.prototype.addValue = function (dv, rtime) {
  this.setValue(this._follower.value + dv, rtime)
}

// Stop advancing value with time.
Continuous.prototype.stop = function () {
  this._stopped = true
}

// Start advancing value with time again. Mark current time as equal to current
// value.
Continuous.prototype.start = function (time_ref) {
  this._stopped = false
  this._svalue_ref = time_ref || elapsed()
  this._value_ref = time_ref || elapsed()
}
