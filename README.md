# SC Exec Hangar Ships

A reference site for Star Citizen players cataloging all known **Exec Hangar Ships** — in-game ships obtainable through the Exec Hangar mechanic — with links to their loadouts on [erkul.games](https://www.erkul.games).

## Ship data

All ship data lives in [`src/data/ships.json`](src/data/ships.json). Each entry follows this shape:

```json
{
  "name": "Anvil F7A Hornet Mk II PYAM Exec",
  "manufacturer": "Anvil Aerospace",
  "image": "https://...",
  "variants": [
    { "label": "Stealth", "erkulUrl": "https://www.erkul.games/loadout/..." },
    { "label": "Military", "erkulUrl": "https://www.erkul.games/loadout/..." }
  ]
}
```

- Ships with a single loadout have one entry in `variants`.
- Ships with two loadouts use `"Stealth"` and `"Military"` as labels.
- Leave `erkulUrl` as an empty string if the loadout isn't available yet — the site will show a **Submit Loadout** CTA linking to a pre-filled GitHub issue.

## Contributing

Each ship card has two contribution pathways built in:

- **⬆ image button** (appears on hover, top-right of card image) — opens a pre-filled GitHub issue to submit a better image
- **SUBMIT LOADOUT ↗** (shown on variants without a loadout link) — opens a pre-filled GitHub issue to contribute an erkul.games URL

For general issues or suggestions, open an issue directly on the [GitHub repository](https://github.com/caseymhunt/sc-exec-ships/issues).

## Local development

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:4321`. Changes to `ships.json` hot-reload automatically.

> **WSL2 note:** File watching uses polling (`usePolling: true`) to work across the Windows filesystem boundary.

## Deployment

The site deploys automatically to Vercel on every push to `main`.
