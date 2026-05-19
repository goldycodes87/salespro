const sharp = require('sharp')
const sizes = [192, 512, 180, 167, 152]
Promise.all(
  sizes.map(s =>
    sharp('public/clozr-icon.svg')
      .resize(s, s)
      .png()
      .toFile(`public/icons/icon-${s}.png`)
      .then(() => console.log(`icon-${s}.png ✓`))
  )
).catch(err => { console.error(err); process.exit(1) })
