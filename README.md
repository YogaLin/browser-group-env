# Browser Group Env

[简体中文](./README.zh-CN.md)

Browser Group Env is a Chrome extension for binding development environment rules to Chrome Tab Groups.

It helps developers keep multiple tasks, branches, or preview environments separated while still using the same Chrome profile and login state.

![Browser Group Env](./docs/assets/marquee-promo-1400x560.jpg)

## Features

- Create and edit environment configurations.
- Bind an environment to one or more Chrome Tab Groups.
- Mark an environment as always on, independent of Tab Groups.
- Scope rules with optional domain, path, and excluded-domain filters.
- Add request headers through Chrome Declarative Net Request rules.
- Replace query parameters through Chrome Declarative Net Request rules.
- Manage reusable configuration templates.
- Resolve template header values from the current page with XPath or CSS selectors.
- Show active, paused, matched, and unmatched states in the popup and toolbar icon.

## Supported Filters

Filters define where an environment is allowed to take effect.

- Domains: exact domains such as `app.example.com`.
- Wildcard subdomains: patterns such as `*.example.com`.
- Paths: optional path patterns such as `/commerce/*` or `/api/*`.
- Excluded domains: domains that must never be matched even if they also match the domain list.

When the domain list is empty, the environment does not filter by domain and applies to every page in its effective scope. Use domain or excluded-domain filters for headers that should not apply across the whole tab group.

## Supported Rules

Browser Group Env currently supports two rule types:

- Request headers: add or replace request headers for matched requests.
- Query parameters: replace a query parameter when it exists, or add it when it is missing.

Rules are installed as Chrome Declarative Net Request session rules and are limited by tab group binding, global enablement, environment state, and filters.

## Use The Release Package

1. Download `browser-group-env-<version>-chrome.zip` from GitHub Releases.
2. Unzip it to a local folder.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click "Load unpacked".
6. Select the unzipped folder.

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

## Release Zip

For GitHub Releases, publish the generated zip file instead of asking users to clone and build the project.

```bash
npm run release
```

The release package is written to `output/browser-group-env-<version>-chrome.zip`.

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
