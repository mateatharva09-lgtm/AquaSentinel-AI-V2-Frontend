<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (AquaSentinel AI)

- Data lives in the browser's IndexedDB via Dexie (`src/lib/db.ts`); the only backend is the external ML prediction service. Why: the app must run offline on any Windows PC without accounts or hosting.
- Read the database only on the client (`useSamples` / `useLiveQuery`); routes render a loading state during SSR. Why: IndexedDB does not exist on the server.
- The assessment model is pure TypeScript in `src/lib/water/model.ts`, deterministic and rule-based; document any rule change on the Methodology page and in tests. Why: the project must never present fabricated ML capability.
- Rule-based assessments are computed from stored measurements on read, never stored. Why: changing the model updates every result consistently.
- The Isolation Forest prediction comes only from the external FastAPI backend via the `predictAnomaly` server function (`src/lib/water/ml.functions.ts`), validated by `parseMlResponse`, and is stored on the sample as `mlResult`. Never fabricate or fall back to a simulated prediction. Why: the backend sends no CORS headers, and results must be real and reproducible from the record.
- Leaflet and jsPDF load only in the browser via dynamic import (`SampleMap` lazy, `PdfButton` preload). Why: both need browser globals and would break SSR.
- Demo rows carry `isDemo: true` and are seeded on first database creation (`db.on("populate")`). Why: demonstration data must always be identifiable and removable.
