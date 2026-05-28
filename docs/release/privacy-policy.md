# Privacy Policy

Last updated: 2026-05-28

Browser Group Env is a Chrome extension for binding Chrome Tab Groups to development environment rules.

## Data Stored Locally

The extension stores configuration in `chrome.storage.local`, including:

- Environment names and settings.
- Tab Group bindings.
- Domain, path, and excluded-domain filters.
- Request header rules and query parameter replacement rules.
- Template definitions.
- Workspace snippets, todos, and notes entered by the user.

This data stays in the user's browser profile.

## Data Accessed by the Extension

The extension reads active tab and Tab Group metadata so it can determine the current environment context and apply request rules only to the intended tabs.

When the user applies a template that uses a CSS selector or XPath value source, the extension may read the configured value from the selected page once and copy it into the generated request header.

## Data Sharing

Browser Group Env does not transmit browsing data, extension configuration, request headers, snippets, todos, notes, or template values to any remote server.

The extension does not sell user data and does not use user data for advertising.

## Remote Code

The extension does not load or execute remote code. Its JavaScript, CSS, images, and localized text are included in the extension package.

## Contact

For questions or issues, use the GitHub repository issue tracker:

https://github.com/YogaLin/browser-group-env/issues
