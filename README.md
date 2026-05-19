# Browser Group Env

[简体中文](./README.zh-CN.md)

Browser Group Env is a Chrome extension for binding development environment rules to Chrome Tab Groups.

It helps developers keep multiple tasks, branches, or preview environments separated while still using the same Chrome profile and login state.

## Features

- Create and edit environment configurations.
- Bind an environment to one or more Chrome Tab Groups.
- Mark an environment as always on, independent of Tab Groups.
- Add request headers with domain/path/excluded-domain filters.
- Replace query parameters through Chrome Declarative Net Request rules.
- Manage reusable configuration templates.
- Resolve template header values from the current page with XPath or CSS selectors.
- Show active, paused, matched, and unmatched states in the popup and toolbar icon.

## Development

```bash
npm install
npm run dev
```

Build the unpacked Chrome extension:

```bash
npm run build
```

The build output is written to `output/chrome-mv3`.

## Testing

```bash
npm run typecheck
npm test
```

## Loading In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select `output/chrome-mv3`.

## License

MIT
