# Architecture and data model

## Intent

A single-page, local-only RAID/RAAIDD management and assurance application. Source XLSX/CSV files are *not* transmitted, and a project can be saved to a portable `.raaidd.json` file. Everything is performed by the browser: the ZIP/OOXML engine, normalised model, validation, analytics and report generation.

## Layers

1. **Import/source layer** — parse ZIP/OOXML or CSV, retain every source worksheet and its bytes/cells, plus per-sheet row ranges and configurable column mappings. Header and first data row are independent.
2. **Normalised record layer** — six record types with common IDs, source pointers and owner/status/priority/score information. Optional specialised type fields are included.
3. **Review layer** — independent reviewer comments, challenges, responses, review status, relationships, snapshots and field-change tracking.
4. **Presentation layer** — searchable records, editable inspector, assurance quality scoring, risk heatmap, composition chart and overdue exception dashboard.
5. **Export layer** — original-layout XLSX/CSV (mapped changes; optional appended columns), enhanced multi-sheet XLSX, DOCX narrative report, editable PPTX board pack, portable project JSON.

## Major modules

| Source file | Purpose |
|---|---|
| `src/zip.js` | ZIP reader/writer; supports stored/deflated files and integrity checks |
| `src/xlsx.js` | XLSX/CSV parsing, mapping helpers, original-layout and enhanced exports |
| `src/model.js` | Field catalogue, six specialist datasets, health/risk scoring rules |
| `src/reports.js` | Word and PowerPoint report generation via OOXML |
| `src/app.js` | Browser UI, reviews, snapshots, comparison and file downloads |
| `src/pptx-template.js` | Embedded base64-edited PowerPoint visual template |
| `scripts/build.py` | Produces hosted `/dist` site and one-file ZIP/HTML offline editions |

## Source preservation and trust boundaries

Each normalised record has `_sheet`, `_row`, `_source`, `_sourceFields`, `_updated`, `_history`, `_comments`, `_review` and `_relationships`. Only fields explicitly edited are written into the original XLSX. Other source ZIP entries are preserved at uncompressed-byte-equivalent XML content, but cannot be guaranteed bit-for-bit or app-format invariant across every complex Excel workbook feature.

Reviews do not silently change the owner's source statements. Review details are retained in enhanced Excel and project JSON; original-layout export focuses on mapped content and optional selected fields. New application-created records only appear in enhanced formats, not in unmapped rows.

## Configurable field model

**Shared:** ID, type, title, description, owner, status, priority, impact, likelihood, due, workstream, category, mitigation, review date, evidence, confidence, decision and source.

**Risk:** cause/event/consequence, residual likelihood/impact, appetite, risk response, preventative controls, contingency, early warnings, triggers and exposure.

**Assumption:** basis, confidence, validation method/owner/date/status, downside if false and fallback.

**Action:** requested by, start, percentage complete, blocker, acceptance, completion date/evidence and sign-off.

**Issue:** occurrence, root cause, severity, affected services, actual impact, estimated cost, resolution approach, workaround, resolution date and escalation.

**Dependency:** direction/type, provider/consumer, deliverable, committed/required dates, delivery confidence, criticality, lead time, fallback and evidence.

**Decision:** authority, deadline, options, recommended alternative, selection criteria, pros/cons, rationale, outcome, date, conditions, objections, implementation owner and superseded decision.

Scoring is intentionally rule-based and interpretable. Risk score is likelihood × impact only when both are numeric 1–5. Management health is a 0–100 completeness/management score, not a certification.

## Output design

- `.xlsx`: native OOXML files with individual worksheets, UTF-8 inline literal strings and source-edit preservation. The local ZIP writer stores uncompressed ZIP members. Formula-like input strings are written as literal text.
- `.docx`: native Word OOXML with executive summary, tables, risks, decisions, actions and assurance comment sections.
- `.pptx`: six editable PowerPoint source slides, dynamically included/excluded by report options. Text, matrix cells and visual rectangles are editable shapes.
- `.raaidd.json`: versioned portable data, including base64 source archive entries and all local review metadata.

## Hosting

Public static hosting on GitHub Pages requires no database, API, secrets, storage account or cloud runtime. `.github/workflows/pages.yml` builds and publishes `/dist` on pushes to `main`, once the repository and Pages settings exist. A custom domain requires user-controlled DNS configuration outside the application.

## Out of scope

Live collaborative editing, background reminders, cloud AI, automated email, auth/account management and a synchronising backend are intentionally omitted.

## Known limits

Unmapped, non-table and heavily merged workbooks need manual review. Complex Office constructs (Excel VBA, encrypted files, external links, pivot caches) are not supported/guaranteed. Browser storage is not a reliable permanent record; export a project periodically. Register-comparison matching uses ID+type. Historical trend calculations are snapshots, not predictions. The offline build uses a local text wordmark, not the remotely loaded header logo asset.