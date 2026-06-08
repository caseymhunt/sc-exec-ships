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
- Leave `erkulUrl` as an empty string if the loadout isn't available yet — the site will show a **Loadout TBD** indicator.

## Local development

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:4321`. Changes to `ships.json` hot-reload automatically.

## Deployment

The site deploys automatically to Vercel on every push to `main`.
