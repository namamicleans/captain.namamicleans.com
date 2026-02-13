# PWA Icons

This folder contains all the icons needed for the Progressive Web App (PWA).

## Required Icons

Generate the following icons from the `icon.svg` file:

| Size | Filename | Purpose |
|------|----------|---------|
| 72x72 | icon-72x72.png | Android Chrome |
| 96x96 | icon-96x96.png | Android Chrome |
| 128x128 | icon-128x128.png | Android Chrome |
| 144x144 | icon-144x144.png | Android Chrome, MS Tile |
| 152x152 | icon-152x152.png | iOS Safari |
| 192x192 | icon-192x192.png | Android Chrome |
| 384x384 | icon-384x384.png | Android Chrome |
| 512x512 | icon-512x512.png | Android Chrome |
| 180x180 | apple-touch-icon.png | iOS Safari |

## Generation Methods

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload the `icon.svg` file
3. Download and extract the generated icons here

### Option 2: Node.js Script
```bash
npm install -D sharp
node scripts/generate-icons.js
```

### Option 3: ImageMagick (CLI)
```bash
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
convert icon.svg -resize 180x180 apple-touch-icon.png
```

## Testing

After adding icons:
1. Run `npm run build`
2. Run `npm run start`
3. Open Chrome DevTools > Application > Manifest
4. Verify all icons are loading correctly
