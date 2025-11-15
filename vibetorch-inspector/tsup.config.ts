import { defineConfig } from 'tsup'

export default defineConfig([
  // Development build (full functionality)
  {
    entry: {
      index: 'src/index.dev.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    external: ['react', 'react-dom'],
    loader: {
      '.ico': 'dataurl',
    },
    esbuildOptions(options) {
      options.jsx = 'transform'
      options.jsxFactory = 'React.createElement'
      options.jsxFragment = 'React.Fragment'
    },
  },
  // Production build (noop component)
  {
    entry: {
      'index.prod': 'src/index.prod.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: false,
    minify: true,
    external: ['react', 'react-dom'],
  },
  // Vite plugin entry (separate config without React)
  {
    entry: {
      'plugins/vite': 'src/plugins/vite.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    external: [
      'vite',
      '@babel/core',
      '@babel/parser',
      '@babel/traverse',
      '@babel/types'
    ],
  },
])