#!/usr/bin/env python3
"""Build the site: index.html, discovery files and headers.

    python3 tools/build.py

PRELAUNCH = True  (until the report launches): the page is public but the report is held back.
  Download buttons read "Available ...", the Agent view shows a notice instead of the Markdown, the page is
  noindex, and the PDF / Markdown files are removed from this folder and git-ignored so they cannot be pushed.
PRELAUNCH = False (launch day): the RC PDF and both Markdown files are copied in, embedded and linked.

The disclaimer is inserted verbatim from the report master (AMINA's page, printed 021), so the website can never
drift from the PDF's legal text.
"""
import pathlib
import re
import shutil
import sys

PRELAUNCH = True

# Franklin Templeton appears only as CV Summit's presenting partner, inside the CV Summit section, with the
# non-endorsement note. FT's permission to use its logo is still open: set False to remove the whole block.
SHOW_FT = True

CONFIG = {
    "VENUE": "CV Summit, Zurich",         # confirmed 17 Sep 2026 (cvsummit.ch: Kongresshaus Zurich)
    "DATE": "29–30 September 2026",
    "DATE_SHORT": "29 September",
    "DATE_ISO": "2026-09-29",
    "PDF": "agentic-finance-report-v1.pdf",
}
REPORT_RC = "RC17"   # the release the site is built from; swap for the final release at launch
REPORT_PDF = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.pdf"
REPORT_FULL_MD = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.full.md"
REPORT_SUMMARY_MD = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.summary.md"

SITE = "https://agenticfinancereport.com"
root = pathlib.Path(__file__).resolve().parent.parent
repo = root.parent.parent
REPORT_FILES = [CONFIG["PDF"], "agentic-finance-report.md", "agentic-finance.summary.md"]

# ---------------------------------------------------------------- the master must be the release we ship
for f in (REPORT_PDF, REPORT_FULL_MD, REPORT_SUMMARY_MD):
    if not (repo / f).exists():
        sys.exit(f"missing {f}")
if (repo / "Agentic_Finance_Report.pdf").read_bytes() != (repo / REPORT_PDF).read_bytes():
    sys.exit(f"Agentic_Finance_Report.pdf in the report repo is not {REPORT_RC}: the disclaimer would come from a "
             "different version. Update REPORT_RC or check out the matching report.")

# ---------------------------------------------------------------- disclaimer (verbatim from the report)
h = (repo / "Agentic_Finance_Report.html").read_text(encoding="utf-8")
i = h.index("— AMINA Bank · Disclaimer</div>")
j = h.index("</section>", i)
paras = re.findall(r'<p style="margin-bottom:[^"]*">(.*?)</p>', h[i:j], re.S)
if len(paras) < 10:
    sys.exit("disclaimer extraction failed: found %d paragraphs" % len(paras))
disclaimer = "\n".join("          <p>%s</p>" % p.strip() for p in paras)

# ---------------------------------------------------------------- template blocks
tpl = (root / "index.template.html").read_text(encoding="utf-8")
keep, drop = ("P", "L") if PRELAUNCH else ("L", "P")
out = re.sub(r"<!--%s-->.*?<!--/%s-->\n?" % (drop, drop), "", tpl, flags=re.S)
out = out.replace("<!--%s-->" % keep, "").replace("<!--/%s-->" % keep, "")
if SHOW_FT:
    out = out.replace("<!--FT-->", "").replace("<!--/FT-->", "")
else:
    out = re.sub(r"<!--FT-->.*?<!--/FT-->", "", out, flags=re.S)

out = out.replace("{{DISCLAIMER}}", disclaimer)
if PRELAUNCH:
    for f in REPORT_FILES:
        (root / f).unlink(missing_ok=True)
else:
    shutil.copyfile(repo / REPORT_PDF, root / CONFIG["PDF"])
    full_md = (repo / REPORT_FULL_MD).read_text(encoding="utf-8")
    (root / "agentic-finance-report.md").write_text(full_md, encoding="utf-8")
    shutil.copyfile(repo / REPORT_SUMMARY_MD, root / "agentic-finance.summary.md")
    out = out.replace("{{MARKDOWN}}", full_md.replace("</script", "<\\/script"))
    out = out.replace("{{MD_WORDS}}", f"{len(full_md.split()):,}")

for k, v in CONFIG.items():
    out = out.replace("{{%s}}" % k, v)
left = re.findall(r"\{\{[A-Z_]+\}\}", out.split('<script type="text/markdown"')[0])
if left:
    sys.exit("unfilled placeholders: %s" % left)
(root / "index.html").write_text(out, encoding="utf-8")

# ---------------------------------------------------------------- discovery files and headers
llms = f"""# Agentic Finance Report

> Industry report, edition 1.0 (2026). Autonomous AI agents that decide and act inside mandates written by people are beginning to manage, move and settle institutional capital on blockchain rails. The report sets out what has to be true before the machine acts: a regulated custodian, final and cheap settlement, visible reasoning, attributable decisions and verifiable agent identity.

Lead author: Marcus Maute, TensorX Swiss Representative (https://www.marcusmaute.com)
Co-authors: TensorX, AMINA Bank, Solana Foundation, APEX:E3, Cardano Foundation
Guest contribution: Blindsight
Foreword: Tim Grant, Executive Chairman, TensorX
Launch: CV Summit 2026, Kongresshaus Zurich, {CONFIG["DATE"]} (https://www.cvsummit.ch), organised by CV Labs
Distribution partner: CV VC AG, Zug (https://www.cvvc.com)
Contact: research@tensorx.ai

## Report

"""
if PRELAUNCH:
    llms += f"- The full report (PDF) and its Markdown editions will be published at {SITE}/ on {CONFIG['DATE']}.\n"
else:
    llms += (f"- [Full report (PDF)]({SITE}/{CONFIG['PDF']}): 56 pages, including sources and the co-authors' disclaimer\n"
             f"- [Full report (Markdown)]({SITE}/agentic-finance-report.md): every chapter, the guest contribution, every source and the disclaimer, with printed page markers\n"
             f"- [Machine-readable summary (Markdown)]({SITE}/agentic-finance.summary.md)\n")
llms += f"""
## Contributors

- [TensorX](https://tensorx.ai): sovereign AI infrastructure for regulated industries
- [AMINA Bank](https://aminagroup.com): FINMA-regulated Swiss bank for digital assets
- [Solana Foundation](https://solana.org): the public ledger for agent-scale settlement
- [APEX:E3](https://apexe3.com): enterprise AI infrastructure for capital markets, operator of ALICE
- [Cardano Foundation](https://cardanofoundation.org): verifiable organisational identity for autonomous agents
- [Blindsight](https://blindsight.io) (guest contribution): runtime protection for AI agents against prompt injection and data poisoning

## Notes

- Figures of $4.8 trillion addressable capital and ~200 bps uplift are modelled by APEX:E3, not measured.
- For information only; not investment, legal or tax advice.
"""
(root / "llms.txt").write_text(llms, encoding="utf-8")

urls = [f"{SITE}/"] + ([] if PRELAUNCH else [f"{SITE}/{f}" for f in REPORT_FILES])
(root / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")

headers = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: interest-cohort=()
""" + ("  X-Robots-Tag: noindex, nofollow\n" if PRELAUNCH else "") + f"""
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.md
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/plain; charset=utf-8

/{CONFIG["PDF"]}
  Content-Type: application/pdf
  Content-Disposition: inline; filename="Agentic_Finance_Report_v1.0.pdf"
  Cache-Control: public, max-age=3600
"""
(root / "_headers").write_text(headers, encoding="utf-8")

# keep the report out of git while it is held back
gi = [".DS_Store", "__pycache__/", "# internal working notes stay local (public repo)", "CLAUDE.md"] + (["# held back until launch (tools/build.py PRELAUNCH)"] + REPORT_FILES if PRELAUNCH else [])
(root / ".gitignore").write_text("\n".join(gi) + "\n", encoding="utf-8")

print(f"index.html written ({'PRE-LAUNCH: report held back' if PRELAUNCH else 'LAUNCH: report published'}; "
      f"{len(paras)} disclaimer paragraphs)")
