# Deployment

[Production application](https://spotter-trip-planner-indol.vercel.app/) · [GitHub repository](https://github.com/Hanzala-Shadow/spotter-trip-planner)

The Vercel project is connected to this repository. Pushing to `main` starts a production deployment; other branches receive previews. Check the deployment's source commit and READY state before treating a change as live.

## Build settings

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `frontend/dist` |
| Python | 3.12 |
| Function duration | 60 seconds |

Vite builds the static React application. The three adapters in `api/` export the same Django WSGI application on the same origin. No catch-all rewrite or separate database is required.

## Environment

Set a random `DJANGO_SECRET_KEY` and keep `DJANGO_DEBUG=false`. Allowed hosts default to localhost, loopback and `.vercel.app`; add the exact hostname for any custom domain.

Optional provider overrides:

| Variable | Purpose |
| --- | --- |
| `OSRM_BASE_URL` | OSRM-compatible routing service |
| `PHOTON_BASE_URL` | Photon-compatible geocoder |
| `VITE_TILE_URL` | Public raster tile URL, configured before building |
| `VITE_TILE_ATTRIBUTION` | Attribution required by the selected tile provider |

Django does not automatically load `.env`. Export local variables or configure them in Vercel. Vite build overrides can be placed in the ignored `frontend/.env.local`.

Do not commit credentials, virtual environments, installed dependencies, generated build output or reference attachments.

## Release verification

1. Wait for the **Verify** workflow on the intended source commit.
2. Confirm the corresponding Vercel production deployment is READY.
3. Run **Demo preflight** against the public alias. It checks health, real route generation, map tiles and paths, fuel popups, daily logs, printing, directions, a narrow layout and cycle restart.
4. Review the generated report and any failed assertions. Public service failures must be resolved before recording a live demonstration.
5. Confirm repository, deployed application and video links are accessible to the intended reviewer.

The repository is private. A source link alone does not grant reviewer access. The candidate arranges access and supplies the completed Loom link through the recruiter's questionnaire.

## Commands

```bash
npm ci
npx playwright install chromium
npm run demo:preflight
```

To target another deployment you are authorized to test:

```bash
DEMO_BASE_URL=https://your-deployment.vercel.app npm run demo:preflight
```

Reports are written to `test-results/demo-preflight/` and attached to the workflow run for seven days.
