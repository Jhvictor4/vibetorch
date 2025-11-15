# Test Plan: Enhanced Export Data

## Unit Testing Instructions

Since this project doesn't have automated tests configured yet, here's how to manually verify the new export format:

### Test 1: Verify ComputedStyles Capture

1. Open dev console in a test app using `@vibetorch/inspector`
2. Select an element with visible styling (e.g., a button with background color)
3. Export to clipboard and parse JSON
4. Check `elements[0].computedStyles` contains:
   - `color` (e.g., "rgb(255, 255, 255)")
   - `backgroundColor` (e.g., "rgb(59, 130, 246)")
   - `fontSize` (e.g., "14px")
   - `fontWeight` (e.g., "500")
   - `display` (e.g., "flex")
   - `visibility` (e.g., "visible")
   - `opacity` (e.g., "1")

### Test 2: Verify Structural Context

1. Select a nested element (e.g., button inside a form inside a div)
2. Export and check `elements[0].structural`:
   - `parent.tagName` should be parent element's tag
   - `parent.className` should contain parent's classes
   - `parent.selector` should be valid CSS selector
   - `depth` should be > 0 (number of ancestors)
   - `siblingCount` should match parent's children count

### Test 3: Verify Context Data

1. Export from any page
2. Check root level `context` object:
   - `url` matches current `window.location.href`
   - `title` matches `document.title`
   - `viewport.width` matches `window.innerWidth`
   - `viewport.height` matches `window.innerHeight`

### Test 4: Verify Element Index

1. Select multiple elements (3+)
2. Export and verify each element has `index` field: 1, 2, 3, etc.

### Expected Export Format

```json
{
  "type": "vibetorch:selection",
  "context": {
    "url": "http://localhost:3000/page",
    "title": "Page Title",
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  },
  "elements": [
    {
      "index": 1,
      "tagName": "button",
      "selector": "button.primary",
      "xpath": "//button[@class='primary']",
      "text": "Click Me",
      "attributes": {"class": "primary", "type": "button"},
      "rect": {...},
      "className": "primary",
      "id": "",
      "computedStyles": {
        "color": "rgb(255, 255, 255)",
        "backgroundColor": "rgb(59, 130, 246)",
        "fontSize": "14px",
        "fontWeight": "500",
        "display": "inline-flex",
        "visibility": "visible",
        "opacity": "1"
      },
      "structural": {
        "parent": {
          "tagName": "div",
          "className": "form-actions",
          "selector": "div.form-actions"
        },
        "depth": 5,
        "siblingCount": 3
      },
      "semantic": {
        "role": "button",
        "label": "Click Me"
      },
      "react": {
        "componentName": "PrimaryButton",
        "source": {...}
      }
    }
  ],
  "timestamp": 1234567890
}
```

## Automated Testing (Future)

To add proper unit tests, install:
```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui"
}
```

Create `src/core/__tests__/element-analyzer.test.ts` for ElementAnalyzer tests.