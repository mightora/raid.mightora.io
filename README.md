# Mightora RAAIDD Studio

> Local-first RAID and RAAIDD Excel mapping, review, visualisation, assurance and reporting. MIT licensed. No server required.

## Start

**Hosted version:** Publish the root contents to GitHub Pages, or serve locally with `python -m http.server 8080` and open `http://localhost:8080/`.

**Offline version:** Run `python scripts/build.py`. Extract `dist/raaidd-offline.zip` and double-click `index.html`. The offline edition has **no dependency on a network, CDN, external API or account**. It uses an embedded plain Mightora wordmark rather than loading the official logo asset from GitHub.

## Features delivered

- Import `.xlsx` and `.csv` files locally, with a separate mapping per worksheet.
- Configure header row, first/last data row, included worksheets and default record type.
- Map arbitrary source column names to common RAAIDD fields and preserve unmapped source columns.
- Optional recommended enhancement columns; **enhancements are not required**.
- Edit records, add reviewer comments/challenges/responses and connect records.
- Review quality scores, prioritised risk matrix, status filters, action delays and governance snapshots.
- Compare an updated workbook with the current register by ID and type.
- Export source-layout `.xlsx` or `.csv`, six-register enhanced `.xlsx`, governance `.docx`, executive editable `.pptx`, and complete `.raaidd.json` project.
- No AI provider, account, backend, analytics or user data upload.

## Privacy / verification

All imported workbook and comment data stays in browser memory. Project exports may contain confidential source workbook data, so treat exported files accordingly. Only *mapping configuration* (column layout and sheet settings) is stored in `localStorage`; no actual record data is deliberately stored there. The user should regularly download the portable project file.

Online pages load Mightora shared UI CSS/JS and js-yaml, plus the official remote Mightora logo. These are the only intended external resource requests; they do not receive imported RAAIDD data. To inspect requests, press **F12 → Network → Preserve log → Reload**. The on-screen resource-domain report is a summary, not a complete security audit.

The downloadable edition contains its entire JavaScript and CSS in one HTML file, uses a restrictive Content Security Policy and makes no network requests. No third-party assets or network fonts are loaded. It does not use `fetch`, `XMLHttpRequest`, WebSockets or telemetry.

## Important compatibility notes

- Standard `.xlsx` supported. Password protected, `.xls`, macro-enabled `.xlsm`, ZIP64 and highly specialised workbooks are not supported; complex Excel features (pivot caches, external connections, embedded objects, macros, slicers) **are not guaranteed to round-trip without changes**. Always keep a backup, and verify an exported workbook in Excel before replacing the authoritative copy.
- Source-layout export updates mapped cells and appends selected optional fields in Excel. New records created in the application appear only in enhanced Excel, reports and project export.
- Field edits update corresponding source cells. Additional comments, reviews and cross-record relationships are stored in the project/enhanced formats, not silently injected into the original workbook layout.
- Workbook comparison uses ID and type; renamed records, duplicated IDs or changed mappings require manual verification.
- Workbook date columns stored as Excel serials are interpreted when mapped to a known date field.
- The bundled ZIP implementation supports non-encrypted, normal ZIP entries with stored/deflate compression and caps entry size to protect browser memory. Exports use uncompressed ZIP members for compatibility and deterministic results; files may be larger.
- The PowerPoint report uses up to six editable slide templates, with inclusion controlled by selected sections; it creates editable native text boxes, rectangles, matrix cells and labels. It doesn't currently generate native Office chart objects or custom slide counts.
- DOCX and PPTX are generated from fixed section templates; review generated files before formal publication.
- Multiple simultaneous reviewers, automatic alerts and cloud AI are intentionally out of scope.

## Code and quality

No NPM runtime packages or libraries are used for workbook imports, file generation or dashboards. `src/zip.js`, `src/xlsx.js`, `src/reports.js`, `src/model.js` and `src/app.js` are first-party browser JavaScript. The PowerPoint's editable slide template is generated with `python-pptx` by `scripts/make_pptx_template.py` and encoded into `src/pptx-template.js`. The build script creates a standalone offline edition from the exact same source files.

Use `python scripts/build.py` and `python tests/smoke.py` to validate. GitHub Actions includes build/smoke checks, CodeQL scanning and GitHub Pages deployment. Badge links on the site point to actual repository paths; a workflow link is not evidence that a particular run passed.

## Future enhancements

- Full rich-file workbook round-trip compatibility checks; nested table/range importer; import file validation and mapping ambiguity warnings.
- Structured reviewer exchange packages and conflict resolution.
- Data-driven editable chart elements in PPTX, multiple report template designs.
- Optional multi-project portfolio aggregation and extended assurance scoring profiles.

## Licence

MIT — see `LICENSE`.

## Documentation

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model and [`docs/SECURITY.md`](docs/SECURITY.md) for the threat model and limitations.