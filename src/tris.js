import { Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'
import { add, subtract, scale, distance } from 'gl-vec2'
import optimizePathOrder from '../utils/optimize-path-order'
import { GUI } from 'dat-gui'
import Alea from 'alea'

const settings = {
  lineLength: 4,
  turnDegrees: 60,
  maxPoints: 800,
  maxLines: 3,
  maxDistance: 8,
  seed: 29
}

export const orientation = Orientation.LANDSCAPE
export const dimensions = [22.5, 30] // [22.9, 30.5]
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [width, height] = dimensions

  const center = [width / 2, height / 2]
  let pathsTaken
  let rand

  let lines = []

  const gui = new GUI()
  gui.add(settings, 'seed', 0, 100).onChange(setup)
  gui.add(settings, 'turnDegrees', 1, 360).step(1).onChange(setup)
  gui.add(settings, 'lineLength', 1, 50).onChange(setup)
  gui.add(settings, 'maxPoints', 1, 1000).step(1).onChange(setup)
  gui.add(settings, 'maxLines', 1, 20).step(1).onChange(setup)
  gui.add(settings, 'maxDistance', 1, 15).onChange(setup)

  setup()

  function setup () {
    lines = []
    rand = new Alea(settings.seed)
    pathsTaken = {}
    while (lines.length < settings.maxLines) {
      const rads = rand() * Math.PI * 2
      const r = rand() * settings.maxDistance
      const start = [
        Math.cos(rads) * r + center[0],
        Math.sin(rads) * r + center[1]
      ]
      const line = [start] // [center]
      while (line.length < settings.maxPoints) {
        const curPt = line[line.length - 1]
        const nextPt = getNextPoint(curPt)
        if (!nextPt) break
        line.push(nextPt)
      }
      lines.push(line)
    }

    lines = optimizePathOrder(lines)
  }

  return {
    draw,
    print,
    animate: true,
    clear: true
  }

  function draw () {
    lines.forEach(points => {
      context.beginPath()
      points.forEach(p => context.lineTo(p[0], p[1]))
      context.stroke()
    })
  }

  function print () {
    return polylinesToSVG(lines, {
      dimensions
    })
  }

  function getNextPoint (curPosition) {
    const points = getPossiblePoints(curPosition)
    if (!points.length) return null
    let next = points[(rand() * points.length) | 0]
    pathsTaken[key(curPosition, next)] = true
    return next
  }

  function getPossiblePoints (position) {
    const directions = []
    let t = 0
    while (t < 360) {
      directions.push(t)
      t += settings.turnDegrees
    }
    const points = directions.map(dir => {
      const rads = dir / 360 * Math.PI * 2
      const vec = scale([], [Math.cos(rads), Math.sin(rads)], settings.lineLength / 10)
      return add(vec, vec, position)
    })
    return points.filter(pt =>
      !pathsTaken[key(pt, position)] && isInViewport(pt)
    )
  }

  function isInViewport (point) {
    // const c = [width / 2, height * 0.65]
    // const r = height * 0.15
    // if (distance(point, c) < r) return false
    return distance(point, center) < settings.maxDistance

    // if (point[0] < 0 || point[1] < 0) return false
    // if (point[0] > width || point[1] > height) return false
    // return true
  }

  function key (pointA, pointB) {
    pointA = pointA.map(num => Math.round(num * 10000))
    pointB = pointB.map(num => Math.round(num * 10000))
    let first, second
    if (pointA[0] < pointB[0]) {
      first = pointA
      second = pointB
    } else if (pointA[0] > pointB[0]) {
      first = pointB
      second = pointA
    } else if (pointA[1] < pointB[1]) {
      first = pointA
      second = pointB
    } else {
      first = pointB
      second = pointA
    }
    return `(${first[0]}-${first[1]})-(${second[0]}-${second[1]})`
  }
}
