# Rural Health Access — Mobile Interface Design

## Product experience

Rural Health Access is a compact, offline-first care-coordination workspace for facility staff. The interface is designed for **portrait 9:16 mobile use**, shared low-end Android devices, and one-handed operation. It follows iOS-style visual hierarchy with large touch targets, plain-language labels, clear status feedback, and compact records rather than dense tables. Staff should be able to register a patient, prioritise their care, and move them through the queue in a few deliberate actions, even while the network is unavailable.

The first prototype will use sample, non-clinical demo data. Its triage indicators are workflow support only; it will clearly state that the final clinical thresholds require local health-authority approval.

## Screen list and layout

| Screen | Primary content and functionality | Layout and interaction decisions |
|---|---|---|
| Operations home | Facility identity, connection/sync state, current queue summary, high-risk count, medicine alert count, and prominent patient actions | A calm top status band, two-line operational summary, and a primary `Register patient` action within thumb reach. Quick actions appear as compact cards rather than a floating multi-action menu. |
| Register patient | Search by local ID/name, duplicate-warning panel, demographics, guardian/contact, and service selection | Search first, then a short form. Required fields are few and grouped by task. The save action remains reachable at the lower edge. |
| Queue board | Service filters, priority groups, patient cards, token/status, priority reason, wait indicator, and next-patient action | Emergency and urgent cases are visually distinct using icon, label, and color. FIFO ordering is visible inside each tier. Staff can call, transfer, pause, or complete through a bottom sheet. |
| Triage | Compact service-specific screening, priority rationale, care category, and override reason | Risk status is explained in full sentences. A clinician override requires a reason selection. The safety note remains visible but does not dominate the screen. |
| Patient record | Header identity, active flags, allergies/current medicines, chronological encounters, vitals, referrals, and follow-up tasks | The summary remains small and stable at the top. The timeline uses short rows with type icons and sync markers. Details open progressively to retain low latency. |
| Referral tracker | Referral list by status, destination, urgency, next follow-up, and a detailed state timeline | Filters are chips. Creating a referral starts from the patient record to avoid re-entering identity data. Valid next statuses are shown as explicit actions. |
| Medicine availability | Medicine search, current stock state, low-stock/expiry badges, dispense or receipt entry, and transaction history | Availability uses `Available`, `Low`, `Out`, or `Last synced` labels; stale stock is never shown as confirmed stock. Stock changes are transaction cards, not editable balances. |
| Facility dashboard | Queue load, waiting-time trend, high-risk care count, referral backlog, medicine alerts, and sync health | A responsive dashboard mode: stacked cards on mobile and a multi-column view on web. Metric cards include a human-readable interpretation, not just totals. |
| Settings | Language selection, local facility settings, sync action/status, data safety notice, and compact sign-out/lock controls | Language changes instantly without discarding form state. The sync summary shows queued changes and last successful update. |

## Key user flows

The principal arrival flow is: **Operations home → Register patient → Select service → Triage → Visible priority explanation → Add to queue → Queue board → Call patient → Record encounter → Refer, dispense, or complete**. The patient record is reachable from every queue and referral item so staff do not need to search again.

The referral flow is: **Patient record → Create referral → Select destination and urgency → Add clinical summary → Save locally or send → Referral tracker → Update status → Complete or mark follow-up overdue**. Pending local changes always carry an explicit sync indicator.

The medicine flow is: **Operations home alert → Medicine availability → Select medicine → Record receipt, dispense, adjustment, wastage, or expiry → Update stock state → Dashboard alert refreshes**. The interface records a transaction rather than permitting silent stock balance edits.

## Information hierarchy and priority language

The system uses four workflow categories: **Emergency**, **Urgent / high-risk**, **Priority**, and **Routine**. Every category appears with both a readable label and a simple icon. The card also carries an explicit reason such as `Maternal care — follow-up due`, `Child care — priority screening`, or `Chronic care — clinician review`. This prevents staff from having to infer why someone moved ahead in the queue.

## Color choices

| Token | Hex value | Intended use |
|---|---:|---|
| Health teal | `#087E7B` | Primary navigation, key actions, and trustworthy operational status |
| Deep ink | `#18332F` | Headings and high-legibility text |
| Warm canvas | `#F7F8F5` | Screen background that remains readable in bright indoor/outdoor light |
| Paper surface | `#FFFFFF` | Cards and forms |
| Safe green | `#198754` | Completed and available states |
| Signal amber | `#B66A00` | Priority, low stock, and attention-required states |
| Critical red | `#B42318` | Emergency and blocking safety states, always paired with icon/text |
| Sky information | `#2369A5` | Pending-sync, informational, and referral progression states |

## Accessibility and low-connectivity constraints

All interactive controls will use large touch targets, strong contrast, text-plus-icon status signals, and brief confirmation feedback. There will be no dependence on animation or color alone. The interface will avoid large media and heavy charts. Lists will be virtualised, records paginated, and the current facility queue stored locally so the core operations screen loads without a network request. Pending, synced, and conflict states will always be visible.
