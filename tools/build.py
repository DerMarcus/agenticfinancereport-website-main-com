#!/usr/bin/env python3
"""Build the site: index.html, discovery files and headers.

    python3 tools/build.py

PRELAUNCH = True  (until the report launches): the page is public but the report is held back.
  Download buttons read "Available ...", the Agent view shows a notice instead of the Markdown, the page is
  noindex, and the Markdown files are removed from this folder and git-ignored so they cannot be pushed.
PRELAUNCH = False (launch day): both Markdown files are copied in, embedded and linked, and the download
  buttons point at REPORT_PDF_PATH (a same-domain redirect to the S3-hosted PDF; see _redirects, below).
  The PDF itself is never copied into this repo: download traffic goes straight to AWS, not Cloudflare.

The disclaimer is inserted verbatim from the report master (AMINA's page, printed 021), so the website can never
drift from the PDF's legal text.
"""
import pathlib
import hashlib
import re
import shutil
import subprocess
import sys

PRELAUNCH = True

# Franklin Templeton appears only as CV Summit's presenting partner, inside the CV Summit section, with the
# non-endorsement note. FT's permission to use its logo is still open: set False to remove the whole block.
SHOW_FT = True

# The PDF is served straight from AWS, not from Cloudflare: this path is a same-domain redirect (see
# _redirects, below) to the S3 object, so download traffic never touches Cloudflare Pages. Both are
# single constants so the target can be changed in one place.
REPORT_PDF_PATH = "/report.pdf"
REPORT_PDF_S3_URL = "https://agenticfinanceindustryreport.s3.us-east-1.amazonaws.com/Agentic_Finance_Report.pdf"

CONFIG = {
    "VENUE": "CV Summit, Zurich",         # confirmed 17 Sep 2026 (cvsummit.ch: Kongresshaus Zurich)
    "DATE": "29–30 September 2026",
    "DATE_SHORT": "29 September",
    "DATE_ISO": "2026-09-29",
    "PDF": REPORT_PDF_PATH,
}
REPORT_RC = "RC25"   # the release the site is built from; swap for the final release at launch
REPORT_PDF = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.pdf"
REPORT_FULL_MD = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.full.md"
REPORT_SUMMARY_MD = f"release/Agentic_Finance_Report_v1.0-{REPORT_RC}.summary.md"

SITE = "https://www.agenticfinancereport.com"
root = pathlib.Path(__file__).resolve().parent.parent
repo = root.parent.parent
# The PDF itself is never copied into this repo (see REPORT_PDF_PATH above) — only the two Markdown
# editions are materialised locally.
REPORT_FILES = ["agentic-finance-report.md", "agentic-finance.summary.md"]

# ---------------------------------------------------------------- the master must be the release we ship
for f in (REPORT_PDF, REPORT_FULL_MD, REPORT_SUMMARY_MD):
    if not (repo / f).exists():
        sys.exit(f"missing {f}")
RC_TAG = f"v1.0-{REPORT_RC.lower()}"
release_pdf_bytes = (repo / REPORT_PDF).read_bytes()
if (repo / "Agentic_Finance_Report.pdf").read_bytes() == release_pdf_bytes:
    # working tree is checked out exactly at this RC: read the master straight off disk
    h = (repo / "Agentic_Finance_Report.html").read_text(encoding="utf-8")
else:
    # the report repo has moved past this RC (normal mid-development: edits toward the next release sit
    # uncommitted or past the tag). Don't let the disclaimer silently drift with them: pull the exact
    # tagged snapshot from git instead, so it can only ever come from REPORT_RC.
    try:
        tagged_pdf = subprocess.run(["git", "show", f"{RC_TAG}:Agentic_Finance_Report.pdf"], cwd=repo,
                                     capture_output=True, check=True).stdout
    except subprocess.CalledProcessError:
        sys.exit(f"Agentic_Finance_Report.pdf in the report repo is not {REPORT_RC}, and git tag {RC_TAG} "
                  "was not found either. Update REPORT_RC or check out the matching report.")
    if tagged_pdf != release_pdf_bytes:
        sys.exit(f"git tag {RC_TAG}'s Agentic_Finance_Report.pdf does not match {REPORT_PDF} either: "
                  "the tag and the release/ file have diverged. Update REPORT_RC or re-check the release.")
    h = subprocess.run(["git", "show", f"{RC_TAG}:Agentic_Finance_Report.html"], cwd=repo,
                        capture_output=True, check=True).stdout.decode("utf-8")

# ---------------------------------------------------------------- disclaimer (verbatim from the report)
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
# Cache busting. /assets/* is served immutable for a year (see _headers), so a returning visitor
# would keep the old CSS/JS after a deploy: the evidence module stayed uninitialised that way on
# 2026-09-24. Stamp both files with a short content hash so each build gets its own URL.
for _asset in ("assets/css/site.css", "assets/js/site.js"):
    _digest = hashlib.md5((root / _asset).read_bytes()).hexdigest()[:8]
    out = out.replace(f'"{_asset}"', f'"{_asset}?v={_digest}"')

(root / "index.html").write_text(out, encoding="utf-8")

# ---------------------------------------------------------------- discovery files and headers
llms = f"""# Agentic Finance Report

> Industry report, edition 1.0 (2026). Autonomous AI agents that decide and act inside mandates written by people are beginning to manage, move and settle institutional capital on blockchain rails. The report sets out what has to be true before the machine acts: a regulated custodian, final and cheap settlement, visible reasoning, attributable decisions and verifiable agent identity.

Lead author: Marcus Maute, TensorX Swiss Representative (https://www.marcusmaute.com)
Co-authors: TensorX, AMINA Bank, Solana Foundation, APEX:E3, Cardano Foundation
Guest contributions: Blindsight, CV VC
Foreword: Tim Grant, Executive Chairman, TensorX
Launch: CV Summit 2026, Kongresshaus Zurich, {CONFIG["DATE"]} (https://www.cvsummit.ch), organised by CV Labs
Co-publishing partner: CV VC AG, Zug (https://www.cvvc.com)
Contact: research@agenticfinancereport.com

## Report

"""
if PRELAUNCH:
    llms += f"- The full report (PDF) and its Markdown editions will be published at {SITE}/ on {CONFIG['DATE']}.\n"
else:
    llms += (f"- [Full report (PDF)]({SITE}{CONFIG['PDF']}): 60 pages (59 numbered), including sources and the co-authors' disclaimer\n"
             f"- [Full report (Markdown)]({SITE}/agentic-finance-report.md): every chapter, both guest contributions, every source and the disclaimer, with printed page markers\n"
             f"- [Machine-readable summary (Markdown)]({SITE}/agentic-finance.summary.md)\n")
llms += f"""
## First agent built on the report's principles

- [Neo](https://github.com/DerMarcus/nftneo): an autonomous agent built by the lead author as a personal project: a published mandate enforced in custody rather than in a prompt (it can buy, it structurally cannot sell) and every decision published before it acts. Not part of the report; pre-launch.

## Contributors

- [TensorX](https://tensorx.ai): sovereign AI infrastructure for regulated industries
- [AMINA Bank](https://aminagroup.com): FINMA-regulated Swiss bank for digital assets
- [Solana Foundation](https://solana.org): the public ledger for agent-scale settlement
- [APEX:E3](https://apexe3.com): enterprise AI infrastructure for capital markets, operator of ALICE
- [Cardano Foundation](https://cardanofoundation.org): verifiable organisational identity for autonomous agents
- [Blindsight](https://blindsight.io) (guest contribution): runtime protection for AI agents against prompt injection and data poisoning
- [CV VC](https://cvvc.com) (guest contribution; also the report's co-publishing partner): early-stage investor in digital assets and AI

## Notes

- Figures of $4.8 trillion addressable capital and ~200 bps uplift are modelled by APEX:E3, not measured.
- For information only; not investment, legal or tax advice.
"""
(root / "llms.txt").write_text(llms, encoding="utf-8")

urls = [f"{SITE}/", f"{SITE}/imprint", f"{SITE}/privacy"] + (
    [] if PRELAUNCH else [f"{SITE}{CONFIG['PDF']}"] + [f"{SITE}/{f}" for f in REPORT_FILES]
)
(root / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")

headers = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: interest-cohort=()
""" + ("  X-Robots-Tag: noindex, nofollow\n" if PRELAUNCH else "") + """
/press*
  X-Robots-Tag: noindex
""" + f"""
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.md
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/plain; charset=utf-8
"""
(root / "_headers").write_text(headers, encoding="utf-8")

# The PDF itself is never served from this domain: /report.pdf 302s straight to the S3 object (see
# REPORT_PDF_PATH / REPORT_PDF_S3_URL, above), so download traffic goes to AWS, not Cloudflare.
# Regenerated on every build so it survives a rebuild.
(root / "_redirects").write_text(f"{REPORT_PDF_PATH}  {REPORT_PDF_S3_URL}  302\n", encoding="utf-8")

# keep the report out of git while it is held back
gi = [".DS_Store", "__pycache__/", "# internal working notes stay local (public repo)", "CLAUDE.md"] + (["# held back until launch (tools/build.py PRELAUNCH)"] + REPORT_FILES if PRELAUNCH else [])
(root / ".gitignore").write_text("\n".join(gi) + "\n", encoding="utf-8")

print(f"index.html written ({'PRE-LAUNCH: report held back' if PRELAUNCH else 'LAUNCH: report published'}; "
      f"{len(paras)} disclaimer paragraphs)")
