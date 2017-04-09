import { PaperSize, Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'
import { GUI } from 'dat-gui'
import newArray from 'new-array'
import bspline from 'b-spline'
import { add, subtract, scale, distance } from 'gl-vec2'
import Alea from 'alea'

const settings = {
  particles: 1,
  steps: 100,
  maxDistance: 10,
  attractors: 3,
  pullThreshold: 4,
  pointsPerSpline: 10,
  degree: 80,
  seed: 608,
  showAttractors: true,
  gravity: 10
}

export const orientation = Orientation.LANDSCAPE
export const dimensions = [17, 25] // [22.9, 30.5] // PaperSize.SKETCHBOOK
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [width, height] = dimensions
  const center = [width / 2, height / 2]
  let lines = []
  let attractors = []
  let rand

  const gui = new GUI()
  gui.add(settings, 'particles', 1, 10).step(1).onChange(onChange)
  gui.add(settings, 'steps', 1, 400).step(1).onChange(onChange)
  gui.add(settings, 'maxDistance', 1, 20).onChange(onChange)
  gui.add(settings, 'attractors', 0, 20).step(1).onChange(onChange)
  gui.add(settings, 'pullThreshold', 0, 20).onChange(onChange)
  gui.add(settings, 'pointsPerSpline', 2, 20).step(1).onChange(onChange)
  gui.add(settings, 'degree', 1, 100).step(1).onChange(onChange)
  gui.add(settings, 'seed', 1, 999).onChange(onChange)
  gui.add(settings, 'showAttractors').onChange(onChange)
  gui.add(settings, 'gravity', 0, 100).onChange(onChange)

  function onChange () {
    // context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    setup()
  }

  setup()

  function setup () {
    rand = new Alea(settings.seed)
    attractors = newArray(settings.attractors).map(() => {
      return {
        position: randomPtInCircle(center, settings.maxDistance)
      }
    })

    const particles = newArray(settings.particles * settings.pointsPerSpline).map(() => {
      const start = randomPtInCircle(center, settings.maxDistance)
      return {
        path: [start],
        velocity: scale([], [rand() - 0.5, rand() - 0.5], 0.5)
      }
    })

    let i = 0
    while (i <= settings.steps) {
      i++
      particles.forEach((p) => {
        const { path, velocity } = p
        const position = path[path.length - 1]
        if (settings.gravity && position[1] > height) {
          velocity[1] *= -1
        }
        const acceleration = [0, 0]
        attractors.forEach(a => {
          const attractorPosition = a.position
          const dist = distance(position, attractorPosition)
          const vecTowardsAttractor = subtract([], attractorPosition, position)
          if (dist < settings.pullThreshold) {
            const pull = scale(vecTowardsAttractor, vecTowardsAttractor, Math.pow(dist, 0.5) / 1000)
            add(acceleration, acceleration, pull)
          }
        })
        if (settings.gravity) {
          const gravitationalPull = [0, 0.0005 * settings.gravity]
          add(acceleration, acceleration, gravitationalPull)
        }
        add(velocity, velocity, acceleration)
        scale(velocity, velocity, 0.99) // friction
        const nextPosition = add([], position, velocity)
        path.push(nextPosition)
      })
    }

    lines = []
    const pointCount = particles[0].path.length
    let k = pointCount
    while (k--) {
      for (let q = 0; q < particles.length; q += settings.pointsPerSpline) {
        const controls = []
        for (let u = 0; u < settings.pointsPerSpline; u++) {
          controls.push(particles[q + u].path[k])
        }
        lines.push(calculatePoints(controls))
      }
    }
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
    if (settings.showAttractors) {
      attractors.forEach(a => {
        context.beginPath()
        context.arc(a.position[0], a.position[1], settings.pullThreshold, 0, Math.PI * 2)
        context.fillStyle = `rgba(219, 68, 68, 0.3)`
        context.fill()
      })
    }
  }

  function print () {
    return polylinesToSVG(lines, {
      dimensions
    })
  }

  function randomPtInCircle (center, radius) {
    const rads = rand() * Math.PI * 2
    const mag = Math.pow(rand(), 0.5) * radius
    return [
      Math.cos(rads) * mag + center[0],
      Math.sin(rads) * mag + center[1]
    ]
  }

  function isInViewport (point) {
    return distance(point, center) < settings.maxDistance
  }

  function calculatePoints (controls) {
    const points = []
    let degree = settings.degree / 100 * controls.length
    degree = Math.max(Math.min(controls.length - 1, degree | 0), 1)
    let progress = 0
    while (progress < 1) {
      points.push(bspline(progress, degree, controls))
      progress += 0.01
    }
    return points
  }
}
