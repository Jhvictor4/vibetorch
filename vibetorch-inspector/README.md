# @vibetorch/inspector

Visual DOM inspector for React apps - click elements to inspect component info.

## Installation

```bash
npm install @vibetorch/inspector --save-dev
# or
yarn add @vibetorch/inspector -D
```

## Usage

### Next.js (App Router)
```tsx
// app/layout.tsx
import { VibetorchInspector } from '@vibetorch/inspector'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <VibetorchInspector />
      </body>
    </html>
  )
}
```

### Vite
```javascript
// vite.config.js
import { vibetorchInspectorPlugin } from '@vibetorch/inspector/plugins/vite'

export default defineConfig({
  plugins: [
    react(),
    vibetorchInspectorPlugin({
      enabled: process.env.NODE_ENV === 'development'
    })
  ]
})
```

### Controls
- `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows) - Toggle inspector
- `Alt` / `Option` - Alternative toggle
- `ESC` - Exit inspection mode

## What it does

- ✓ Click elements to inspect React components
- ✓ Shows component name, props, and source location
- ✓ Auto-disabled in production (tree-shaken to 0KB)
- ✓ Works with Next.js, Vite, and CRA

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
