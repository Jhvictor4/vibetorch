# VibeTorch

[![npm](https://img.shields.io/npm/v/vibetorch?label=vibetorch)](https://www.npmjs.com/package/vibetorch)
[![npm](https://img.shields.io/npm/v/@vibetorch/inspector?label=@vibetorch/inspector)](https://www.npmjs.com/package/@vibetorch/inspector)

Use Cursor 2.0's inspector with any agents / IDEs you prefer. \
Run `npx vibetorch` at your project root, and you're all set.

### 
<table>
  <tr>
    <td>
      <video src="https://github.com/user-attachments/assets/413b906a-4f69-43ef-a436-78d5adb362e0" controls width="320"></video>
    </td>
    <td>
      <video src="https://github.com/user-attachments/assets/44907a8b-42aa-4194-9866-e60b5ec6012b" controls width="320"></video>
    </td>
  </tr>
</table>



## How does it work

VibeTorch injects a visual DOM inspector into your React app. Click any element to inspect its React component, props, and source location. \
The inspector exports element data to your clipboard in a format that AI agents can understand. \

You can assign shortcuts to toggle inspector as well.

https://github.com/user-attachments/assets/fa6bf0b5-7a11-4d4b-82e1-468b8d268c3b


## Commands

```bash
# Setup inspector
npx vibetorch

# Remove inspector
npx vibetorch remove
```

## Controls

- `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows) - Toggle inspector
- `Alt` / `Option` - Alternative toggle
- `ESC` - Exit
- `Enter` - Export selected elements

## Supports

- Next.js (App Router & Pages Router)
- Vite
- Create React App

## Requirements

Node.js ≥ 18, React ≥ 16.8

## License

MIT
