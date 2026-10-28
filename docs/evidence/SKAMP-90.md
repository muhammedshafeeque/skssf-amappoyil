# SKAMP-90 — Define shared TypeScript types and Zod schemas for all collections

Branch: `feature/SKAMP-90-shared-schemas`

## What was added (`packages/shared/src`)
| File | Contents |
|---|---|
| `constants.ts` | `REGION`, `MEMBER_ID_PREFIX`, `DONATION_GAP_DAYS` (90), `COL` collection names |
| `enums.ts` | roles, blood groups, member status, wings (Viqaya, TREND, Sahachari, Campus, Twalaba, Sargalaya, IFC, Media, Organet), aid categories, support types, patient/equipment/post/request statuses, donation modes, equipment types, reactions |
| `schemas/common.ts` | `TimestampLike` (SDK-agnostic), date (`YYYY-MM-DD`), E.164 phone, member ID, hierarchy codes, location + default Amappoyil/Kerala/India |
| `schemas/members.ts` | member input/update/status-change, `Member`, `PhoneIndexEntry`, `MemberCounter` |
| `schemas/blood.ts` | non-member donor input (consent required), my-donor-details, `BloodDonor`, urgent blood request payload, `DonorResponse` |
| `schemas/sahachari.ts` | patient input/`Patient`/`PatientPublic`/timeline note, donation input (amount-or-item, donor-or-anonymous), equipment, issue, return, patient & equipment request payloads |
| `schemas/committee.ts` | committee input with optional wing, `CommitteeMember` |
| `schemas/posts.ts` | post input, `Post`, `PostReaction`, news submission payload |
| `schemas/requests.ts` | discriminated `requestInputSchema` by type, profile correction payload, `MemberRequest`, `reviewRequestSchema` |
| `schemas/system.ts` | `SkampClaims`, `setRoleSchema`, unit settings (hierarchy codes), `AuditLog` |
| `ids.ts` | `formatMemberId` (SKAMP001…SKAMP999, SKAMP1000), `parseMemberNumber`, `normalizePhone` (Indian input → E.164), `maskPhone` |

Zod is pinned to 3.25.x.

## Evidence

`pnpm --filter @skamp/shared exec vitest run --reporter=verbose`
```
 ✓ src/schemas.test.ts > constants > uses asia-south1 and the agreed collection names 3ms
 ✓ src/schemas.test.ts > member IDs and phones > formats and parses SKAMP IDs 2ms
 ✓ src/schemas.test.ts > member IDs and phones > normalises Indian phone numbers to E.164 and masks them 1ms
 ✓ src/schemas.test.ts > memberInputSchema > accepts a valid member and defaults wing tags 4ms
 ✓ src/schemas.test.ts > memberInputSchema > rejects bad phone, date and blood group 3ms
 ✓ src/schemas.test.ts > donorInputSchema > requires consent for non-member donors 1ms
 ✓ src/schemas.test.ts > patientInputSchema > needs at least one support type and a known category 1ms
 ✓ src/schemas.test.ts > donationInputSchema > needs an amount or an item, and a donor unless anonymous 1ms
 ✓ src/schemas.test.ts > requestInputSchema > validates payload by request type 2ms
```

`pnpm build` → `Tasks: 3 successful, 3 total` · `pnpm typecheck` → `Tasks: 5 successful, 5 total`
(functions, admin and mobile all compile against the new exports).
