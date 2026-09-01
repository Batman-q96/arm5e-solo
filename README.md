# ArM5e Solo

A Foundry Virtual Tabletop module for solo Ars Magica Fifth Edition play.

## Development

This repository is installed directly in Foundry's `Data/modules` directory. Restart Foundry, or use the Reload Application option, after changing module files.

Run the local validation before testing in Foundry:

```powershell
npm run validate
```

## Installation

For development, enable **ArM5e Solo** in a world from **Manage Modules**. For releases, use the manifest URL from `module.json` after publishing a GitHub release containing `module.zip`.

## Project layout

- `module.json`: Foundry module manifest and compatibility metadata.
- `scripts/`: Module JavaScript entry points.
- `styles/`: Module CSS.
- `lang/`: Foundry localization files.
