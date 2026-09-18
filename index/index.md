# Agentic Finance Index

Version 0.1 · 18 September 2026 · https://agenticfinancereport.com/index/ · data: entries.json (CC0)

A free register of agentic-finance deployments and infrastructure, by layer and status, and of the mandates
their agents run under (Open Mandate, https://agenticfinancereport.com/mandate/). It grows out of the Agentic
Finance Report (https://agenticfinancereport.com/), whose stack table and five preconditions are its schema.
Nobody pays to be listed. Every entry names the source of its status. Corrections are public.

## The three questions

1. Is this agent real, and who stands behind it? (identity)
2. Is it actually bounded, or only instructed? (the mandate, and where each limit is enforced)
3. Has it stayed inside its mandate so far? (the record)

The Index registers operators' answers to question 2 and lists the infrastructure for question 1. Attestation
(an independent check of declared enforcement) is not offered yet. Nothing here is an attestation, rating or
endorsement.

## Rules

- Nobody pays to be listed; no paid placement; data is CC0.
- The listed party does not set its own status; status comes from a named public source. Operators can confirm or dispute.
- Corrections are logged with date and reason; entries are never silently edited.
- The editor's own projects are listed under the same rules with a disclosure line.

## Entries (launch, 18 September 2026)

| ID | Name | Layer | What | Status | Source | Confirmed |
|---|---|---|---|---|---|---|
| AFI-0001 | AMINA Bank | regulated-foundation | FINMA-regulated custody, settlement and fiat rails | in production | Report ed. 1.0, ch. 03, 08 | asked |
| AFI-0002 | Solana | execution | Single global state, sub-second finality, stablecoin settlement, x402, payment channels | in production | Report ed. 1.0, ch. 04, 08 | asked |
| AFI-0003 | TensorX | inference | Sovereign inference on EU hardware, zero retention, open-weight models, x402 | in production | Report ed. 1.0, ch. 05, 08 | asked |
| AFI-0004 | ALICE (APEX:E3) | orchestration | Multi-agent orchestration for capital markets, traceable reasoning | in production | Report ed. 1.0, ch. 06, 08 | asked |
| AFI-0005 | vLEI via Veridian (Cardano Foundation) | identity | Verifiable organisational identity for agents, KERI/ACDC | standards live; QVI accreditation in progress | Report ed. 1.0, ch. 07, 08 | asked |
| AFI-0006 | Blindsight | runtime-protection | Checks that a proposed action matches the principal's request; injection and poisoning detection | in production (figures supplied, not independently verified) | Report ed. 1.0, guest contribution | asked |
| AFI-0007 | Neo (NFTNeo) | agent | Autonomous collector under a published mandate: can buy, cannot sell; publishes before acting | mandate declared; pre-launch | Open Mandate OM-0001 | yes (editor's project) |

## Register

- A deployment: email index@agenticfinancereport.com with operator, layer, what runs, jurisdiction and a public source for the status.
- A mandate: write it against https://agenticfinancereport.com/mandate/schema.json and send the JSON, or open a pull request at https://github.com/DerMarcus/agenticfinancereport-website-main-com.
- Agents: https://agenticfinancereport.com/skill.md

## Methodology v0.1

Layers follow the report's stack. Status: in production (public source shows clients or live activity), standards
live (standard exists, deployment in progress), forward-looking (announced or designed), declared (operator is the
only source). Supplied figures are labelled. Disputes by email with a source; logged with outcome. The Index is
not a rating, endorsement, attestation or investment advice.

## Corrections log

- 2026-09-18: Index published with seven entries; operators AFI-0001 to AFI-0006 asked to confirm.

## Who runs this

Edited by Marcus Maute (https://www.marcusmaute.com), lead author of the report, as an initiative separate from
the co-authors. Future address: https://agenticfinanceindex.com/ under an entity independent of every organisation
listed. Contact: index@agenticfinancereport.com
