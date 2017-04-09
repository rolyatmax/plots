import { PaperSize, Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'
import newArray from 'new-array'
import { add, subtract, scale, distance } from 'gl-vec2'
import Alea from 'alea'

const settings = {
  lineLength: 0.4,
  turnDegrees: 60,
  maxPoints: 800,
  maxLines: 3,
  maxDistance: 8,
  seed: 29
}

export const orientation = Orientation.LANDSCAPE
export const dimensions = [22.9, 30.5]
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [width, height] = dimensions

  const center = [width / 2, height / 2]
  const pathsTaken = {}
  const rand = new Alea(settings.seed)

  const lines = []

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

  return {
    draw,
    print,
    animate: false,
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
      const vec = scale([], [Math.cos(rads), Math.sin(rads)], settings.lineLength)
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
