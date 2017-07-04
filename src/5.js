import Alea from 'alea'
import SimplexNoise from 'simplex-noise'
import { distance } from 'gl-vec2'
import { GUI } from 'dat-gui'

import optimizePathOrder from '../utils/optimize-path-order'
import { Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'

export const orientation = Orientation.LANDSCAPE
export const dimensions = [22.9, 30.5]
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [ width, height ] = dimensions
  const center = [width / 2, height / 2]
  const settings = {
    seed: 18,
    circleCount: 2000,
    sketchSize: 50,
    minCircleSize: 3,
    maxCircleSize: 30,
    showCircles: false,
    noiseFactor: 1,
    circlePadding: -10
  }

  // const gui = new GUI()
  // gui.add(settings, 'seed', 0, 500).step(1).onChange(setup)
  // gui.add(settings, 'circleCount', 1, 5000).step(1).onChange(setup)
  // gui.add(settings, 'sketchSize', 1, 100).step(1).onChange(setup)
  // gui.add(settings, 'noiseFactor', 1, 100).step(1).onChange(setup)
  // gui.add(settings, 'minCircleSize', 1, 50).step(1).onChange(setup)
  // gui.add(settings, 'maxCircleSize', 10, 500).step(1).onChange(setup)
  // gui.add(settings, 'showCircles').onChange(setup)

  let lines = []
  let circles = []
  let rand
  let simplex
  const circlesCache = {}

  setup()

  function setup () {
    lines = []
    circles = circlesCache[JSON.stringify(settings)] || []
    rand = new Alea(settings.seed)
    simplex = new SimplexNoise(rand)

    if (!circles.length) {
      let failedTries = 0
      while (circles.length < settings.circleCount && failedTries < 1000) {
        let position
        let radius
        let tries = 0
        while ((!position || !radius) && tries < 100) {
          const rads = rand() * Math.PI * 2
          const mag = Math.pow(rand(), 0.5) * settings.sketchSize / 10
          const potentialPosition = [
            Math.cos(rads) * mag + center[0],
            Math.sin(rads) * mag + center[1]
          ]
          if (isValidPosition(potentialPosition)) {
            position = potentialPosition
          }
          tries += 1
          if (!position) {
            continue
          }
          radius = generateRadius(position)
          if (!radius) {
            continue
          }
        }
        if (position && radius) {
          circles.push({ position, radius })
        } else {
          failedTries += 1
          console.warn('failedTries:', failedTries)
        }
      }
      console.log(`created ${circles.length} circles`)
      circlesCache[JSON.stringify(settings)] = circles
    }

    for (let circle of circles) {
      // const rads = rand() * Math.PI * 2
      const x = circle.position[0] / 1000 * settings.noiseFactor
      const y = circle.position[1] / 1000 * settings.noiseFactor
      const noiseFactor1 = simplex.noise2D(x, y)
      const noiseFactor2 = simplex.noise2D(x * 1.234 + 100, y * 1.234 + 100)
      const noiseFactor3 = simplex.noise2D(x * 2.345, y * 2.345)
      const noiseFactor = (noiseFactor1 + noiseFactor2 + noiseFactor3) / 3
      const rads = noiseFactor * Math.PI * 2

      const pt1 = [
        Math.cos(rads) * circle.radius + circle.position[0],
        Math.sin(rads) * circle.radius + circle.position[1]
      ]
      const pt2 = [
        Math.cos(rads + Math.PI) * circle.radius + circle.position[0],
        Math.sin(rads + Math.PI) * circle.radius + circle.position[1]
      ]
      lines.push([pt1, pt2])
    }

    lines = optimizePathOrder(lines, false) // don't merge paths

    let distances = lines.map(line => distance(line[0], line[1]))
    let min = Math.min(...distances)
    let max = Math.max(...distances)
    let diff = max - min

    // const segment = 3
    //
    // lines = lines.filter(line => {
    //   const dist = distance(line[0], line[1])
    //   return (
    //     dist >= diff * segment / 4 + min &&
    //     dist < diff * (segment + 1) / 4 + min
    //   )
    // })
  }

  return {
    draw,
    print,
    animate: false,
    clear: true
  }

  function generateRadius (position) {
    let radius = (rand() * (settings.maxCircleSize - settings.minCircleSize) + settings.minCircleSize) / 100
    let maxRadius = settings.sketchSize / 10 - distance(position, center)
    for (let circle of circles) {
      const dist = distance(position, circle.position)
      maxRadius = Math.min(maxRadius, dist - circle.radius)
    }
    radius = Math.min(maxRadius, radius)
    if (radius < settings.minCircleSize / 100) return null
    return radius
  }

  function isValidPosition (position) {
    for (let circle of circles) {
      if (distance(circle.position, position) < settings.circlePadding / 100 + circle.radius + settings.minCircleSize / 100) return false
    }
    return true
  }

  function draw () {
    if (settings.showCircles) {
      circles.forEach(circle => {
        context.beginPath()
        context.strokeStyle = 'rgba(100,100,100,0.3)'
        context.arc(circle.position[0], circle.position[1], circle.radius, 0, Math.PI * 2)
        context.stroke()
      })
    }

    lines.forEach(points => {
      context.beginPath()
      context.strokeStyle = 'rgba(40, 40, 40, 0.8)'
      points.forEach(p => context.lineTo(p[0], p[1]))
      context.stroke()
    })
  }

  function print () {
    return polylinesToSVG(lines, {
      dimensions
    })
  }
}
