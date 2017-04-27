export default function optimizePathOrder (paths) {
  const preoptimizedDistance = getTravelingDistance(paths)
  console.log('preoptimizedDistance', preoptimizedDistance)

  const newPaths = []
  newPaths.push(paths[0])

  paths = paths.slice(1)

  while (paths.length) {
    const lastPath = newPaths[newPaths.length - 1]
    const curPt = lastPath[lastPath.length - 1]
    const { idx, reverse } = paths.reduce((closest, path, i) => {
      const firstPt = path[0]
      const lastPt = path[path.length - 1]
      const distanceToFirst = squaredDistance(curPt, firstPt)
      const distanceToLast = squaredDistance(curPt, lastPt)
      if (!closest) {
        return {
          idx: i,
          distance: Math.min(distanceToFirst, distanceToLast),
          reverse: distanceToLast < distanceToFirst
        }
      }
      if (distanceToFirst < closest.distance) {
        return {
          idx: i,
          distance: distanceToFirst,
          reverse: false
        }
      }
      if (distanceToLast < closest.distance) {
        return {
          idx: i,
          distance: distanceToLast,
          reverse: true
        }
      }
      return closest
    }, null)
    let closestPath = paths.splice(idx, 1)[0].slice()
    if (reverse) {
      closestPath.reverse()
    }
    newPaths.push(closestPath)
  }

  const optimizedDistance = getTravelingDistance(newPaths)
  console.log('optimizedDistance', optimizedDistance)

  return newPaths
}

// this is the distance between paths - from the end of path 1 to the start of path 2
function getTravelingDistance (paths) {
  let total = 0
  let lastPt = paths[0][paths[0].length - 1]
  for (let path of paths.slice(1)) {
    const squaredDist = squaredDistance(lastPt, path[0])
    total += Math.sqrt(squaredDist)
    lastPt = path[path.length - 1]
  }
  return total
}

function squaredDistance (pt1, pt2) {
  const dx = pt2[0] - pt1[0]
  const dy = pt2[1] - pt1[1]
  return dx * dx + dy * dy
}
