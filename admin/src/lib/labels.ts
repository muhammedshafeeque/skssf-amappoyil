// Display labels for stored values.
export const LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  sahajari_coordinator: 'Sahajari coordinator',
  member: 'Member',
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
  non_member: 'Non-member',
  dialysis: 'Dialysis',
  kidney_transplant: 'Kidney transplant medicine',
  cancer: 'Cancer',
  heart: 'Heart',
  road_accident: 'Road accident',
  other: 'Other',
  medical: 'Medical',
  financial: 'Financial',
  equipment: 'Equipment',
  food: 'Food',
  pending: 'Pending',
  approved: 'Approved',
  closed: 'Closed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  male: 'Male',
  female: 'Female',
  in: 'Received',
  out: 'Given',
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank',
  in_kind: 'In kind',
  wheelchair: 'Wheelchair',
  ambulance: 'Ambulance',
  stretcher: 'Stretcher',
  walker: 'Walker',
  oxygen_cylinder: 'Oxygen cylinder',
  air_bed: 'Air bed',
  hospital_bed: 'Hospital bed',
  good: 'Good',
  fair: 'Fair',
  needs_repair: 'Needs repair',
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
  retired: 'Retired',
  draft: 'Draft',
  published: 'Published',
  patient_add: 'Add patient',
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

export const label = (v: string | null | undefined) => (v ? (LABELS[v] ?? v) : '');

export const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'default',
  blocked: 'error',
  pending: 'warning',
  approved: 'info',
  closed: 'default',
  rejected: 'error',
  cancelled: 'default',
  available: 'success',
  assigned: 'info',
  maintenance: 'warning',
  retired: 'default',
  draft: 'default',
  published: 'success',
};

export function formatTs(ts: { toDate(): Date } | null | undefined): string {
  return ts ? ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export function rupees(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : `₹${n.toLocaleString('en-IN')}`;
}
