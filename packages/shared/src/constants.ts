/** Cloud Functions region for every callable and trigger. */
export const REGION = 'asia-south1';

/** Prefix for Unit Member IDs (SKAMP001, SKAMP002, ...). */
export const MEMBER_ID_PREFIX = 'SKAMP';

/** Days a donor must wait after donating before they are shown as eligible. */
export const DONATION_GAP_DAYS = 90;

/** Firestore collection names. */
export const COL = {
  members: 'members',
  bloodDonors: 'bloodDonors',
  patients: 'patients',
  patientsPublic: 'patientsPublic',
  donations: 'donations',
  equipment: 'equipment',
  equipmentIssues: 'issues',
  committee: 'committee',
  posts: 'posts',
  postReactions: 'reactions',
  requests: 'requests',
  phoneIndex: 'phoneIndex',
  counters: 'counters',
  auditLogs: 'auditLogs',
  settings: 'settings',
  staff: 'staff',
} as const;
