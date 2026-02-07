# MediSaathi Frontends

Two separate frontend applications:

| App      | Path              | Stack        | Run locally                    |
|----------|-------------------|--------------|---------------------------------|
| **Website** | `frontend/website/` | Vite + React | `make frontend-website` or `npm run frontend:website` |
| **Mobile**  | `frontend/mobile/`  | Expo (React Native) | `make frontend-mobile` or `npm run frontend:mobile` |

## Setup (both)

From repo root:

```bash
make frontend-setup
# or: npm run frontend:setup
```

Or per app:

```bash
make frontend-website-setup   # website only
make frontend-mobile-setup    # mobile only
```

## Run

- **Website** (default for `make frontend`): `make frontend-website` or `cd website && npm run dev`
- **Mobile**: `make frontend-mobile` or `cd mobile && npx expo start --clear`

See root **Makefile** and **package.json** for all commands.
