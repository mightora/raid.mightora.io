# Security and privacy engineering notes

This tool is designed for local-only handling of project governance registers. The **offline edition** is the preferred mode for confidential data because it contains all application resources in one file and applies `connect-src 'none'` and a script hash in its Content Security Policy. The hosted edition loads Mightora shared UI components and other static resources from remotely maintained origins. No application feature sends imported RAAIDD records to an API, but users should assess the trustworthiness of any remote UI script before importing highly sensitive registers.

## Threats and mitigations

| Threat | Mitigation | Remaining considerations |
|---|---|---|
| Malicious XLSX archive / ZIP bomb | 25 MB file upload cap, 32 MB per entry, 100 MB inflated total, CRC-32 integrity checks, encrypted/ZIP64 unsupported | A complex or maliciously crafted workbook may still consume significant browser memory |
| Untrusted XML / HTML | DOMParser XML (no external entity resolution) and escaping of user-supplied strings before generating HTML and OOXML | Always review documents generated from external files |
| Spreadsheet formula injection | User-supplied strings exported as XLSX inline literal strings; CSV formula-like strings remain text in the file | Opening CSV in spreadsheet software may evaluate leading formula characters. **Do not open untrusted CSV in Excel without precautions**. Use XLSX when formula-injection risk matters |
| Data exfiltration | No fetch/XHR/analytics/network APIs for application logic; offline edition CSP `connect-src 'none'` | Hosted third-party/shared UI scripts can have access to the page context; sensitive registers should use offline edition |
| Data loss | Source workbook preserved in memory, review metadata stored separately and portable project export available | Sessions are not auto-saved; keep frequent `.raaidd.json` exports |
| Untrusted Office files | Standard OOXML elements, static report templates and literal escaping | Verify exported files in Excel/Word/PowerPoint before publishing or replacing records |
| Incorrect importer mapping | Live preview, manual column remapping, per-sheet range selection | User remains responsible for verifying mappings, dates and ID consistency |
| Misleading assurance | Described scoring criteria, missing values called out and no false compliance claims | Quality score is a diagnostic aid, not independent certification |

## Inspect requests

Press F12 → Network → Preserve log → Reload. In the downloadable single-file edition, the application itself does not generate HTTP requests. Browser plugins, browser update checks and extensions are outside the app's control. The on-screen resource report is informational and does not replace an independent security audit.

## Handling source registers

Keep the original workbook. Do not post governance material to public issue trackers. Treat the project `.raaidd.json`, enhanced `.xlsx`, Word report and PowerPoint export as potentially confidential, because they can include copied evidence, personal names, commercial positions and reviewer observations. Delete local exports according to your organisation's retention policies.

## Security checks

Automated smoke tests verify no app HTTP requests in offline browser execution, valid Office packages and parsing, and a source-register round trip. GitHub CodeQL security analysis is configured as a workflow; until the repository exists and a run succeeds, no passing security status should be claimed.