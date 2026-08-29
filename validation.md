# Prototype Validation Notes

## Automated checks

The focused workflow suite passed on 25 August 2026. It covers maternal and child danger-sign priority precedence, FIFO ordering within urgency tiers, restricted referral transitions, and de-duplication of retried offline operation IDs. The TypeScript compile check also completed without errors.

| Check | Result | Coverage |
|---|---|---|
| Workflow tests | Passed | 4 focused tests; the starter authentication test remains intentionally skipped |
| TypeScript | Passed | Mobile screens, local persistence provider, shared workflow helpers, and server sync receipt endpoint |
| Database migration | Applied | Non-destructive creation of facilities, facility memberships, and idempotent sync receipt tables |

## Visual verification

Portrait mobile views were checked for Operations, Queue, Patients, Referrals, Medicines, Facility Dashboard, and Patient Registration. The layouts preserve high-risk labels, pending-sync visibility, clear calls to action, and bottom navigation without visible overlaps. The facility dashboard was also checked at a desktop viewport, where metric cards and operational panels use a responsive multi-column layout.

## Scope note

The current prototype persists a local demo workspace and simulates acknowledgement when the user chooses Sync now. It includes a protected server endpoint and database receipt log for future authenticated device synchronisation, but it does not yet push live patient data to the server. Clinical priority thresholds, user identity policy, country-specific compliance, and pilot facility configuration require approval before live clinical use.
