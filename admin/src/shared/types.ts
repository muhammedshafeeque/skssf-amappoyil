// GENERATED from functions/src/shared by scripts/sync-shared.mjs — edit there, not here.
// Stored document shapes. Timestamps are typed loosely so the same types work with the
// web SDK, React Native Firebase and the Admin SDK.
import type {
  BloodGroup,
  DonationDirection,
  DonationMode,
  DonorSource,
  EquipmentCondition,
  EquipmentStatus,
  EquipmentType,
  MemberStatus,
  PatientCategory,
  PatientStatus,
  PostStatus,
  RequestStatus,
  RequestType,
  Role,
  SupportType,
} from './constants';
import type { PatientAddPayload } from './schemas';

export interface TimestampLike {
  toDate(): Date;
  toMillis(): number;
}

export interface Audited {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  createdBy?: string;
  updatedBy?: string;
}

export interface Location {
  place: string;
  state: string;
  country: string;
}

export interface SkampClaims {
  role?: Role;
  memberId?: string;
}

export interface Member extends Audited {
  memberId: string;
  skssfId: string | null;
  name: string;
  nameLower: string;
  phone: string;
  bloodGroup: BloodGroup;
  fatherName: string;
  houseName: string;
  address: string;
  dob: string;
  status: MemberStatus;
  statusReason: string | null;
  photoUrl: string | null;
  authUid: string | null;
  unitCode: string;
}

export interface BloodDonor extends Audited {
  source: DonorSource;
  memberId: string | null;
  name: string;
  nameLower: string;
  dob: string;
  bloodGroup: BloodGroup;
  phone: string;
  location: Location;
  isLocal: boolean;
  lastDonated: string | null;
  available: boolean;
  active: boolean;
  hideNumber: boolean;
  consent: { given: boolean; at: TimestampLike | null; recordedBy: string | null };
}

export interface StaffUser {
  email: string | null;
  displayName: string | null;
  role: Role | null;
  updatedBy: string;
  updatedAt: TimestampLike;
}

export interface CommitteeMember extends Audited {
  name: string;
  designation: string;
  phone: string;
  email: string | null;
  memberId: string | null;
  photoUrl: string | null;
  order: number;
  term: string;
  isCurrent: boolean;
}

export interface Patient extends Audited {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: string;
  condition: string;
  need: string;
  category: PatientCategory;
  supportTypes: SupportType[];
  status: PatientStatus;
  notes: string | null;
  source: 'admin' | 'request';
  requestId: string | null;
  totals?: { received: number; given: number };
}

export interface PatientPublic {
  name: string;
  need: string;
  category: PatientCategory;
  status: PatientStatus;
  updatedAt: TimestampLike;
}

export interface Donation extends Audited {
  direction: DonationDirection;
  donorName: string | null;
  anonymous: boolean;
  amount: number | null;
  item: string | null;
  mode: DonationMode;
  date: string;
  purpose: string;
  patientId: string | null;
  patientName: string | null;
  receiptNo: string | null;
}

export interface Equipment extends Audited {
  code: string;
  type: EquipmentType;
  name: string;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  notes: string | null;
  currentAssignment: {
    assignmentId: string;
    patientId: string;
    patientName: string;
    issuedAt: string;
    expectedReturn: string | null;
  } | null;
}

export interface Assignment {
  patientId: string;
  patientName: string;
  issuedTo: string;
  phone: string;
  issuedAt: string;
  expectedReturn: string | null;
  deposit: number | null;
  notes: string | null;
  issuedBy: string;
  returnedAt: string | null;
  returnCondition: EquipmentCondition | null;
  returnNotes: string | null;
  returnedBy: string | null;
  createdAt?: TimestampLike;
}

export interface Post extends Audited {
  title: string;
  body: string;
  images: string[];
  status: PostStatus;
  pinned: boolean;
  notify: boolean;
  publishedAt: TimestampLike | null;
  notifiedAt: TimestampLike | null;
  authorId: string;
}

export interface RequestDoc {
  type: RequestType;
  status: RequestStatus;
  payload: PatientAddPayload;
  requestedBy: { uid: string; memberId: string; name: string };
  review: { by: string; at: TimestampLike; note: string | null } | null;
  resultRef: string | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface AuditLog {
  collection: string;
  docId: string;
  action: 'create' | 'update' | 'delete';
  actor: string;
  changed: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: TimestampLike;
}
