// Fixed value lists used across the app. Keep labels in the clients; these are stored values.

export const ROLES = ['superAdmin', 'admin', 'sahachari', 'member'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that sign in to the web admin panel. */
export const STAFF_ROLES = ['superAdmin', 'admin', 'sahachari'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const MEMBER_STATUSES = ['active', 'inactive', 'blocked'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const WINGS = [
  'viqaya',
  'trend',
  'sahachari',
  'campus',
  'twalaba',
  'sargalaya',
  'ifc',
  'media',
  'organet',
] as const;
export type Wing = (typeof WINGS)[number];

export const DONOR_SOURCES = ['member', 'nonMember'] as const;
export type DonorSource = (typeof DONOR_SOURCES)[number];

export const AID_CATEGORIES = [
  'dialysis',
  'kidneyTransplant',
  'cancer',
  'heart',
  'roadAccident',
  'other',
] as const;
export type AidCategory = (typeof AID_CATEGORIES)[number];

export const SUPPORT_TYPES = ['medical', 'financial', 'equipment', 'food'] as const;
export type SupportType = (typeof SUPPORT_TYPES)[number];

export const PATIENT_STATUSES = ['pending', 'active', 'closed'] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const DONATION_MODES = ['cash', 'upi', 'bank', 'inKind'] as const;
export type DonationMode = (typeof DONATION_MODES)[number];

export const EQUIPMENT_TYPES = [
  'wheelchair',
  'ambulance',
  'stretcher',
  'walker',
  'oxygenCylinder',
  'airBed',
  'hospitalBed',
  'commode',
  'other',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_STATUSES = ['available', 'inUse', 'underRepair', 'retired'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_CONDITIONS = ['good', 'fair', 'damaged'] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export const POST_CATEGORIES = ['event', 'bloodCamp', 'sahachari', 'announcement'] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_STATUSES = ['draft', 'scheduled', 'published', 'unpublished'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const REQUEST_TYPES = ['patient', 'equipment', 'blood', 'profile', 'post'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REACTIONS = ['like', 'love', 'dua'] as const;
export type Reaction = (typeof REACTIONS)[number];
