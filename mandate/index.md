# Open Mandate v0.1

Draft · 18 September 2026 · https://agenticfinancereport.com/mandate/ · schema: schema.json (JSON Schema
2020-12, CC0) · maintained by the Agentic Finance Index (https://agenticfinancereport.com/index/)

The Agentic Finance Report's claim: a boundary that exists only in a prompt is not a boundary; the mandate must be
enforced where the agent cannot reach it. Open Mandate is that mandate as a document.

## Fields

- principal: who answers for the agent (name, LEI/vLEI, jurisdiction)
- agent: name, identity (vlei | erc-8004 | solana-attestation | masumi | other), runtime (model, provider, version_pinned, holds_keys = false)
- permitted_universe: instruments by kind and reference
- venues_allowlist, counterparties_allowlist
- caps: per_transaction, per_day, under_management, time_window, currency
- prohibited_actions: what is structurally impossible (transfer_out, sell, arbitrary_contract_call, change_own_mandate, ...)
- tiers: operational (agent acts alone), tactical (agent proposes, person confirms), strategic (people only), escalation_above
- revocation: by, mechanism, timelock
- enforcement[]: control, layer (custody | signer | token | rail | identity | runtime | other), mechanism, evidence_url
- audit: ledger_url, publishes_before_acting, format
- declared_at, source_report, status (declared | attested | revoked)

## Conformance

Well-formed = validates against the schema. Conformant = every enforcement entry names a control outside the
reasoning layer with published evidence; holds_keys is false; prohibited_actions is not empty; revocation works
without the agent's cooperation.

## Declared mandates

- OM-0001: Neo (NFTNeo), operator Marcus Maute (personal project). Can buy on-chain generative art on allowlisted venues within a daily cap; cannot sell or transfer out (Safe module + signing-enclave policy). Publishes before acting; append-only ledger. Declared; pre-launch. https://agenticfinancereport.com/mandate/OM-0001.json
- OM-0002: reference treasury mandate from the report's chapter 03 envelope; illustrative, not a live deployment. https://agenticfinancereport.com/mandate/OM-0002.json

## Declare

Write against schema.json, validate, then email index@agenticfinancereport.com or open a pull request at
https://github.com/DerMarcus/agenticfinancereport-website-main-com. Free; not an endorsement.
Agents: https://agenticfinancereport.com/skill.md
