# Deployment and handoff

## Current external setup

The application is deployed at [https://spotter-trip-planner-indol.vercel.app/](https://spotter-trip-planner-indol.vercel.app/). Vercel accepted a direct upload of 30 application/build files and built the React frontend plus three Python functions. All four supplied reference files, documentation, Git history and local environments were excluded from the upload. The public production URL works without Vercel sign-in.

The private source repository is [Hanzala-Shadow/spotter-trip-planner](https://github.com/Hanzala-Shadow/spotter-trip-planner). Source publication uses small sequential commits with remote branch and blob-hash verification after each push. The original five local phase commits remain in the review package's Git bundle. Large employer reference attachments stay in that package and are not required to build or run the source.

The existing Vercel project was deployed directly and has no Git repository link. Publishing code to GitHub does not redeploy production. Connecting the existing project to this repository remains a separate deployment setup step.
Project: `prj_eDvzP2dSaugKfzAPKwBK2C670sSc`. Deployment: `dpl_6r1VYFq9yi9mqmci5qv7io89GyDm`. Source application commit: `ada11ca`. State: READY. Vercel created the first deployment as production; its shorter production alias is public, while the team preview alias requires Vercel sign-in.

For current source, clone the GitHub repository. To inspect the original phase history separately, clone the enclosed Git bundle into a different folder:

```bash
git clone https://github.com/Hanzala-Shadow/spotter-trip-planner.git
git clone spotter-trip-planner.git.bundle spotter-phase-history
```

The extracted source folder is also provided. Do not upload `.venv`, `node_modules`, local environment files or the review package ZIP to the public repository.

## Vercel project

The deployed project uses these build settings, also declared in `vercel.json`:

| Setting           | Value                                   |
| ----------------- | --------------------------------------- |
| Root directory    | Repository root                         |
| Framework preset  | Vite (detected); explicit static output |
| Install command   | `npm ci`                                |
| Build command     | `npm run build`                         |
| Output directory  | `frontend/dist`                         |
| Python            | 3.12                                    |
| Function duration | 60 seconds                              |

Set `DJANGO_SECRET_KEY` to a newly generated random value. `DJANGO_DEBUG` should remain `false`. `DJANGO_ALLOWED_HOSTS` defaults to localhost, loopback and `.vercel.app`; add an exact custom domain if one is attached. No LLM key is needed.

The project uses public default providers, with optional environment overrides:

- `OSRM_BASE_URL`: OSRM-compatible road routing service.
- `PHOTON_BASE_URL`: Photon-compatible geocoder.
- `VITE_TILE_URL` and `VITE_TILE_ATTRIBUTION`: matching raster tile service and its required attribution, set before building.

Environment files are examples; Django does not automatically read `.env`. Export variables in a local shell or set them in the Vercel dashboard. For Vite local build-time overrides, use `frontend/.env.local` (gitignored).

Vercel's [file-based Python documentation](https://vercel.com/docs/functions/runtimes/python/api-directory) supports WSGI applications in `/api`. The three adapters are tested locally. The hosted build, health endpoint, location search and three live routed plans have been verified.

## Release checklist

Desktop and core hosted checks have passed. Source publication is complete. GitHub Actions now includes the desktop/mobile browser suite and uploads its screenshots and PDFs. Check the verification record for the latest run result; Loom recording and submission remain open.

1. Confirm the deployed homepage loads its JS/CSS and `/api/health` returns Django status.
2. Generate the three supplied samples using live providers. Check route lines, markers, directions, cycle restart and fuel stop placement.
3. Test location search, empty/invalid cycle hours, provider-error recovery and stale-result notice.
4. At desktop width and 390px mobile width, inspect form usability, map controls, popups, table scrolling and absence of page-wide overflow.
5. Print the multi-day logs to PDF using Letter portrait and inspect every page, duty line, daily total and remark. Confirm no clipping or blank leading page.
6. Run the supplied browser tests; investigate any failure before marking the phase verified.
7. Record the 3–5 minute Loom after the author has reviewed and understood the code.
8. Verify all three submission URLs open for an external reviewer. Submission itself has not been authorized or sent.
