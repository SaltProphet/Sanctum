# Route Smoke-Check List

Run these checks against production (or a production-like preview) after deploy.

## Canonical navigation paths

- [ ] Home: `GET /` renders landing page.
- [ ] Feed: `GET /feed` resolves (or intentionally 404s with branded 404).
- [ ] Room: `GET /room/<valid-room-id>` loads room shell.
- [ ] Profile: `GET /profile` resolves (or intentionally 404s with branded 404).
- [ ] Settings: `GET /settings` resolves (or intentionally 404s with branded 404).

## Direct deep-link checks

- [ ] Open `https://<host>/room/<valid-room-id>` in a fresh browser tab (no prior navigation) and confirm page renders.
- [ ] Open `https://<host>/dashboard` directly and confirm auth/redirect behavior is correct.
- [ ] Open a random unknown path `https://<host>/does-not-exist` and confirm branded 404 is shown.

## Base path checks (if `NEXT_PUBLIC_BASE_PATH` is set)

- [ ] Every app link includes the base path prefix.
- [ ] Direct deep-link under base path (for example `/<base>/room/<id>`) resolves.
- [ ] Static assets load with the configured `assetPrefix` (if set).


## Veriff webhook smoke checks

- [ ] Send signed `POST https://<host>/api/webhooks/veriff` with headers `x-veriff-signature`, `x-veriff-timestamp`, and JSON body containing `eventId`, `creatorId`, `status`, and `occurredAt`; confirm `200` with `{ ok: true }`.
- [ ] Send the same payload with an invalid `x-veriff-signature`; confirm `401` and verification failure response.
- [ ] Send a validly signed payload missing `creatorId` or `occurredAt`; confirm `400` payload validation error.
- [ ] Confirm `POST https://<host>/webhooks/veriff` behaves as compatibility alias while canonical integrations use `/api/webhooks/veriff`.
