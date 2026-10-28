// GENERATED from functions/src/shared by scripts/sync-shared.mjs — edit there, not here.
// Shared between functions, admin and mobile. Edit in functions/src/shared, then run
// `node scripts/sync-shared.mjs` to copy into admin/src/shared and mobile/src/shared.

export const REGION = 'asia-south1';
export const MEMBER_ID_PREFIX = 'SKAMP';
export const UNIT_CODE = 'AMP';
export const DEFAULT_ELIGIBILITY_GAP_DAYS = 90;
export const DEFAULT_LOCATION = { place: 'Amappoyil', state: 'Kerala', country: 'India' } as const;

export const ROLES = ['super_admin', 'admin', 'sahajari_coordinator', 'member'] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES = ['super_admin', 'admin', 'sahajari_coordinator'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const ADMIN_ROLES = ['super_admin', 'admin'] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const MEMBER_STATUSES = ['active', 'inactive', 'blocked'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const DONOR_SOURCES = ['member', 'non_member'] as const;
export type DonorSource = (typeof DONOR_SOURCES)[number];

export const PATIENT_CATEGORIES = ['dialysis', 'kidney_transplant', 'cancer', 'heart', 'road_accident', 'other'] as const;
export type PatientCategory = (typeof PATIENT_CATEGORIES)[number];

export const SUPPORT_TYPES = ['medical', 'financial', 'equipment', 'food'] as const;
export type SupportType = (typeof SUPPORT_TYPES)[number];

export const PATIENT_STATUSES = ['pending', 'approved', 'active', 'closed'] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
/** Statuses members can see (through patientsPublic). */
export const PUBLIC_PATIENT_STATUSES: readonly PatientStatus[] = ['approved', 'active'];

export const GENDERS = ['male', 'female', 'other'] as const;

export const DONATION_DIRECTIONS = ['in', 'out'] as const;
export type DonationDirection = (typeof DONATION_DIRECTIONS)[number];
export const DONATION_MODES = ['cash', 'upi', 'bank', 'in_kind'] as const;
export type DonationMode = (typeof DONATION_MODES)[number];

export const EQUIPMENT_TYPES = [
  'wheelchair',
  'ambulance',
  'stretcher',
  'walker',
  'oxygen_cylinder',
  'air_bed',
  'hospital_bed',
  'other',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export const EQUIPMENT_CONDITIONS = ['good', 'fair', 'needs_repair'] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export const EQUIPMENT_STATUSES = ['available', 'assigned', 'maintenance', 'retired'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const REQUEST_TYPES = ['patient_add'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
/** Request types Sahajari coordinators can see and review. */
export const SAHAJARI_REQUEST_TYPES: readonly RequestType[] = ['patient_add'];
export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const COL = {
  members: 'members',
  counters: 'counters',
  phoneIndex: 'phoneIndex',
  skssfIndex: 'skssfIndex',
  bloodDonors: 'bloodDonors',
  settings: 'settings',
  staff: 'staff',
  committee: 'committee',
  patients: 'patients',
  patientsPublic: 'patientsPublic',
  donations: 'donations',
  equipment: 'equipment',
  assignments: 'assignments',
  posts: 'posts',
  requests: 'requests',
  pushTokens: 'pushTokens',
  auditLogs: 'auditLogs',
  rateLimits: 'rateLimits',
} as const;
