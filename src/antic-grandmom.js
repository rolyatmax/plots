import Alea from 'alea'
import { GUI } from 'dat-gui'
import { randomNormal } from 'd3-random'
import SimplexNoise from 'simplex-noise'
import { distance, squaredDistance, lerp } from 'gl-vec2'
import lineclip from 'lineclip'

import optimizePathOrder from '../utils/optimize-path-order'
import { Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'

export const orientation = Orientation.LANDSCAPE
export const dimensions = [22.9, 30.5]
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [ width, height ] = dimensions
  const settings = {
    seed: 293,
    lineCount: 500,
    sigma: 5,
    maxDist: 6,
    toCut: 0.1,
    noiseSize: 180,
    useNoise: false,
    margin: 1
  }

  const gui = new GUI()
  gui.add(settings, 'seed', 0, 1000).step(1).onChange(setup)
  gui.add(settings, 'lineCount', 0, 1000).step(1).onChange(setup)
  gui.add(settings, 'sigma', 0, 10).step(0.1).onChange(setup)
  gui.add(settings, 'maxDist', 0.1, 30).step(0.1).onChange(setup)
  gui.add(settings, 'toCut', 0, 4).step(0.05).onChange(setup)
  gui.add(settings, 'noiseSize', 1, 200).step(1).onChange(setup)
  gui.add(settings, 'margin', 0, 5).step(0.5).onChange(setup)
  gui.add(settings, 'useNoise').onChange(setup)

  let rand
  let randX
  let randY
  let simplex
  let lines
  let center

  setup()

  function setup () {
    center = [width / 2, height / 2]
    context.clearRect(0, 0, width, height)
    rand = new Alea(settings.seed)
    randX = randomNormal.source(rand)(center[0], settings.sigma)
    randY = randomNormal.source(rand)(center[1], settings.sigma)
    simplex = new SimplexNoise(rand)
    lines = []
    while (lines.length < settings.lineCount) {
      const start = [randX(), randY()]
      // const lastLine = lines[lines.length - 1]
      // const start = lastLine ? lastLine[1] : [randX(), randY()]
      if (distance(start, center) > settings.maxDist) continue
      let dir
      if (settings.useNoise) {
        const noiseSize = (sizeOffset = 0) => (settings.noiseSize + sizeOffset) / 1000
        const noise1 = simplex.noise2D(start[0] * noiseSize(10), start[1] * noiseSize(10))
        const noise2 = simplex.noise2D(start[0] * noiseSize() + 1000, start[1] * noiseSize() + 1000)
        dir = (noise1 + noise2) * Math.PI
      } else {
        dir = rand() * 2 * Math.PI
      }
      const dist = width + height
      const end = [
        Math.cos(dir) * dist + start[0],
        Math.sin(dir) * dist + start[1]
      ]
      const line = [start, end]
      const firstIntersection = getFirstLineIntersection(line, lines)
      const newLine = cutLineByLength([start, firstIntersection], settings.toCut)
      lines.push(newLine)
    }
    const bbox = [
      settings.margin, settings.margin,
      width - settings.margin, height - settings.margin
    ]
    lines = lines.map((points) => lineclip.polyline(points, bbox)[0])
    lines = lines.filter(line => line && line.length)
    lines = optimizePathOrder(lines)
  }

  function draw () {
    lines.forEach(l => drawLine(context, l[0], l[1]))
  }

  function print () {
    return polylinesToSVG(lines, {
      dimensions
    })
  }

  return {
    draw,
    print,
    animate: true,
    clear: true
  }
}

function getFirstLineIntersection (line, lines) {
  let closestIntersection = null
  let closestIntersectionDist = Infinity
  let n = lines.length
  while (n--) {
    const intersection = segmentIntersection(line, lines[n])
    if (!intersection) continue
    const dist = squaredDistance(line[0], intersection)
    if (Number.isFinite(dist) && dist < closestIntersectionDist) {
      closestIntersectionDist = dist
      closestIntersection = intersection
    }
  }
  return closestIntersection || line[1]
}

function cutLineByLength (line, toCut) {
  const [start, end] = line
  const length = distance(start, end)
  const newLength = Math.max(0, length - toCut)
  const newEnd = lerp([], start, end, newLength / length)
  return [start, newEnd]
}

function drawLine (ctx, start, end) {
  ctx.beginPath()
  ctx.moveTo(start[0], start[1])
  ctx.lineTo(end[0], end[1])
  ctx.stroke()
}

// Adapted from http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect/1968345#1968345
const EPS = 0.0000001
function between (a, b, c) {
  return a - EPS <= b && b <= c + EPS
}
function segmentIntersection ([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) {
  var x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
          ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))
  var y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
          ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))
  if (isNaN(x) || isNaN(y)) {
    return false
  }
  if (x1 >= x2) {
    if (!between(x2, x, x1)) return false
  } else {
    if (!between(x1, x, x2)) return false
  }
  if (y1 >= y2) {
    if (!between(y2, y, y1)) return false
  } else {
    if (!between(y1, y, y2)) return false
  }
  if (x3 >= x4) {
    if (!between(x4, x, x3)) return false
  } else {
    if (!between(x3, x, x4)) return false
  }
  if (y3 >= y4) {
    if (!between(y4, y, y3)) return false
  } else {
    if (!between(y3, y, y4)) return false
  }
  return [x, y]
}
