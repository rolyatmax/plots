import Alea from 'alea'
import SimplexNoise from 'simplex-noise'
import vec2 from 'gl-vec2'
import { GUI } from 'dat-gui'

import optimizePathOrder from '../utils/optimize-path-order'
import { Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'

export const orientation = Orientation.LANDSCAPE
export const dimensions = [22.9, 30.5]
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [ width, height ] = dimensions
  const settings = {
    seed: 92,
    step: 15,
    noiseStep: 20,
    lineLength: 15,
    margin: 8,
    showCircles: false
  }

  const gui = new GUI()
  gui.add(settings, 'seed', 0, 500).step(1).onChange(setup)
  gui.add(settings, 'lineLength', 2, 500).step(1).onChange(setup)
  gui.add(settings, 'step', 5, 50).step(1).onChange(setup)
  gui.add(settings, 'noiseStep', 1, 100).step(1).onChange(setup)
  gui.add(settings, 'margin', 1, 16).onChange(setup)
  gui.add(settings, 'showCircles').onChange(setup)

  let lines = []
  let circles = []
  let simplex

  setup()

  function setup () {
    lines = []
    circles = []

    const rand = new Alea(settings.seed)
    simplex = new SimplexNoise(rand)
    const margin = getLineLength() + settings.margin

    let xNoiseStart = rand() * 100 | 0
    let yNoise = rand() * 100 | 0
    for (let y = margin; y <= height - margin; y += getStep() * 2) {
      yNoise += getNoiseStep()
      const noise = [xNoiseStart, yNoise]
      drawRow(y, noise[0], noise[1])
    }

    lines = optimizePathOrder(lines)

    function drawRow (y, xNoise, yNoise) {
      for (let x = settings.margin; x <= width - settings.margin; x += getStep() * 2) {
        xNoise += getNoiseStep()
        drawPoint(x, y, xNoise, yNoise)
      }
    }

    function drawPoint (x, y, xNoise, yNoise) {
      const noiseFactor1 = simplex.noise2D(xNoise, yNoise)
      const noiseFactor2 = simplex.noise2D(xNoise * 1.234 + 100, yNoise * 1.234 + 100)
      const noiseFactor3 = simplex.noise2D(xNoise * 2.345, yNoise * 2.345)
      const noiseFactor = (noiseFactor1 + noiseFactor2 + noiseFactor3) / 2.5
      const angle = noiseFactor * Math.PI * 2
      let end = [Math.cos(angle), Math.sin(angle)]
      vec2.normalize(end, end)
      end = end.map(coord => coord * getLineLength())
      circles.push({
        center: [x, y],
        radius: getLineLength()
      })
      lines.push([
        [x, y],
        [end[0] + x, end[1] + y]
      ])
    }
  }

  return {
    draw,
    print,
    animate: true,
    clear: true
  }

  function getLineLength () {
    return settings.lineLength / 100
  }

  function getStep () {
    return settings.step / 100
  }

  function getNoiseStep () {
    return settings.noiseStep / 1000
  }

  function draw () {
    if (settings.showCircles) {
      circles.forEach(circle => {
        context.beginPath()
        context.strokeStyle = 'rgba(40, 40, 40, 0.05)'
        context.arc(circle.center[0], circle.center[1], circle.radius, 0, Math.PI * 2)
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
