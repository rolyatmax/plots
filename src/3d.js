import { Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'
import Alea from 'alea'
import createCamera from 'perspective-camera'
import { GUI } from 'dat-gui'
import newArray from 'new-array'
import SimplexNoise from 'simplex-noise'
import { triangulate } from 'delaunay'

export const orientation = Orientation.LANDSCAPE
export const dimensions = [17, 25] // [22.9, 30.5]
export const outputImageHeight = 800

const settings = {
  seed: Math.random() * 100,
  points: 150,
  pow: 12,
  noiseStep: 5,
  noiseMag: 10,
  cameraX: 0,
  cameraY: 30,
  cameraZ: 60
}

export default function createPlot (context, dimensions) {
  const [width, height] = dimensions
  let lines = []
  let rand

  const gui = new GUI()
  gui.add(settings, 'seed', 0, 100).onChange(setup)
  gui.add(settings, 'points', 0, 500).step(1).onChange(setup)
  gui.add(settings, 'pow', -100, 100).step(1).onChange(setup)
  gui.add(settings, 'noiseStep', 0, 1000).step(1).onChange(setup)
  gui.add(settings, 'noiseMag', 0, 100).step(1).onChange(setup)
  gui.add(settings, 'cameraX', 0, 100).step(1).onChange(setup)
  gui.add(settings, 'cameraY', 0, 100).step(1).onChange(setup)
  gui.add(settings, 'cameraZ', 0, 100).step(1).onChange(setup)

  setup()

  function setup () {
    rand = new Alea(settings.seed)
    const simplex = new SimplexNoise(rand)
    const camera = createCamera({
      viewport: [0, 0, width, height]
    })

    let positions = newArray(settings.points).map(() => {
      const rads = rand() * Math.PI * 2
      const mag = Math.pow(rand(), settings.pow / 10)
      return [
        Math.cos(rads) * mag,
        Math.sin(rads) * mag
      ]
    })

    const triIndices = triangulate(positions)
    const cells = []
    for (let i = 0; i < triIndices.length; i += 3) {
      cells.push([
        triIndices[i],
        triIndices[i + 1],
        triIndices[i + 2]
      ])
    }

    const cameraPosition = [
      settings.cameraX / 10, settings.cameraY / 10, settings.cameraZ / 10
    ]

    camera.identity()
    camera.translate(cameraPosition)
    camera.lookAt([0, 0, 0])
    camera.update()

    // add random z
    positions.forEach(p => {
      const noiseStep = settings.noiseStep / 400
      p[2] = simplex.noise2D(p[0] * noiseStep, p[1] * noiseStep) * settings.noiseMag / 200
    })

    lines = cells.map(cell => {
      const points = cell.map((i) => camera.project(positions[i]))
      points.push(points[0])
      return points
    })
  }

  return {
    draw,
    print,
    animate: true,
    clear: true
  }

  function draw () {
    context.strokeStyle = 'rgba(30, 30, 30, 0.4)'
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
}
