import Alea from 'alea'
import SimplexNoise from 'simplex-noise'
import vec2 from 'gl-vec2'

import { PaperSize, Orientation } from 'penplot'
import { polylinesToSVG } from 'penplot/util/svg'

export const orientation = Orientation.LANDSCAPE
export const dimensions = [21, 21] // PaperSize.SKETCHBOOK
export const outputImageHeight = 800

export default function createPlot (context, dimensions) {
  const [ width, height ] = dimensions
  const settings = {
    seed: 92,
    step: 0.05,
    noiseStep: 20,
    lineLength: 0.07,
    margin: 7
  }

  let { step, lineLength, seed, noiseStep } = settings

  const lines = []
  const circles = []

  const rand = new Alea(seed)
  const simplex = new SimplexNoise(rand)
  const margin = lineLength + settings.margin

  let xNoiseStart = rand() * 100 | 0
  let yNoise = rand() * 100 | 0
  for (let y = margin; y <= height - margin; y += step * 2) {
    yNoise += noiseStep / 1000
    const noise = [xNoiseStart, yNoise]
    drawRow(y, noise[0], noise[1])
  }

  function drawRow (y, xNoise, yNoise) {
    for (let x = margin; x <= width - margin; x += step * 2) {
      xNoise += noiseStep / 1000
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
    end = end.map(coord => coord * lineLength)
    circles.push({
      center: [x, y],
      radius: settings.lineLength
    })
    lines.push([
      [x, y],
      [end[0] + x, end[1] + y]
    ])
  }

  return {
    draw,
    print,
    animate: false,
    clear: true
  }

  function draw () {
    // circles.forEach(circle => {
    //   context.beginPath()
    //   context.strokeStyle = 'rgba(40, 40, 40, 0.05)'
    //   context.arc(circle.center[0], circle.center[1], circle.radius, 0, Math.PI * 2)
    //   context.stroke()
    // })

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
