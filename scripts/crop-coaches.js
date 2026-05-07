const sharp = require('sharp')
const path = require('path')

const src = path.join(__dirname, '../public/Coaches.png')
const outDir = path.join(__dirname, '../public/coaches')

async function run() {
  const meta = await sharp(src).metadata()
  console.log(`Source image: ${meta.width}x${meta.height}`)

  const w = Math.floor(meta.width / 2)
  const h = Math.floor(meta.height / 2)

  await Promise.all([
    sharp(src).extract({ left: 0, top: 0, width: w, height: h }).toFile(path.join(outDir, 'jordan.png')),
    sharp(src).extract({ left: w, top: 0, width: w, height: h }).toFile(path.join(outDir, 'victoria.png')),
    sharp(src).extract({ left: 0, top: h, width: w, height: h }).toFile(path.join(outDir, 'coach-ray.png')),
    sharp(src).extract({ left: w, top: h, width: w, height: h }).toFile(path.join(outDir, 'noel.png')),
  ])

  console.log('Cropped:')
  console.log('  jordan.png    — top-left')
  console.log('  victoria.png  — top-right')
  console.log('  coach-ray.png — bottom-left')
  console.log('  noel.png      — bottom-right')
}

run().catch(console.error)
