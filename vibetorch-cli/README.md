# vibetorch

Dead simple CLI for VibeTorch Inspector - auto-setup in one command.

## Usage

```bash
# Setup: Install + inject code + auto-format (all in one!)
npx vibetorch

# Remove injected code
npx vibetorch remove
# or
npx vibetorch rm
```

## What it does

1. ✓ Detects your framework (Next.js, Vite, CRA)
2. ✓ Finds your entry file automatically
3. ✓ Installs `@vibetorch/inspector` if needed
4. ✓ Injects `<VibetorchInspector />` component

Then just run `npm run dev` and you're ready!

## Supported Frameworks

- **Next.js** (App Router & Pages Router)
- **Vite**
- **Create React App**

## Requirements

- Node.js ≥ 18
- npm or yarn
- A React/Next.js project with a `dev` script in package.json

## License

MIT
