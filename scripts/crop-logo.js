const sharp = require('sharp')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')

async function main() {
  const src = path.join(publicDir, 'salespro-logo.png')

  // Horizontal logo: icon + wordmark
  const horiz = await sharp(src)
    .extract({ left: 180, top: 70, width: 960, height: 320 })
    .toFile(path.join(publicDir, 'salespro-horizontal.png'))
  console.log('salespro-horizontal.png:', horiz.width, 'x', horiz.height)

  // Icon only: S mark
  const icon = await sharp(src)
    .extract({ left: 540, top: 490, width: 240, height: 300 })
    .toFile(path.join(publicDir, 'salespro-icon.png'))
  console.log('salespro-icon.png:', icon.width, 'x', icon.height)

  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
