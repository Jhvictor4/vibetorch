import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import replace from '@rollup/plugin-replace'
import image from '@rollup/plugin-image'

const production = !process.env.ROLLUP_WATCH

export default [
  // UMD build for CDN
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/vibetorch-inspector.umd.js',
      format: 'umd',
      name: 'VibetorchInspector',
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    },
    external: ['react', 'react-dom'],
    plugins: [
      image(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        preventAssignment: true
      }),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      production && terser()
    ]
  },
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm'
    },
    external: ['react', 'react-dom'],
    plugins: [
      image(),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist'
      })
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs'
    },
    external: ['react', 'react-dom'],
    plugins: [
      image(),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  }
]