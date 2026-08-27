function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = url
  })
}

export async function getCroppedDataUrl(imageSrc, pixelCrop, filterCss = 'none') {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  ctx.filter = filterCss
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  )
  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function exportFinalImage(imageSrc, pixelCrop, filterCss = 'none', stickers = [], outputSize = 400) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')

  ctx.filter = filterCss
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputSize, outputSize
  )

  if (stickers.length > 0) {
    ctx.filter = 'none'
    const fontSize = Math.round(outputSize * 0.11)
    ctx.font = `${fontSize}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const s of stickers) {
      ctx.fillText(s.emoji, s.x * outputSize, s.y * outputSize)
    }
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}
