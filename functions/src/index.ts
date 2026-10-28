import { onCall } from 'firebase-functions/v2/https';
import './lib/firebase';
import { REGION } from './shared';

/** Health check. */
export const ping = onCall(() => ({ ok: true, region: REGION, at: new Date().toISOString() }));

export { setStaffRole } from './auth/setStaffRole';
export { lookupMember, completeMemberLogin } from './auth/memberLogin';
export { createMember, updateMember, setMemberStatus, deleteMember } from './members/members';
export { onMemberWritten, updateMyDonorDetails } from './members/bloodSync';
export { submitRequest, cancelRequest, reviewRequest } from './requests/requests';
export { onPatientWritten, onDonationWritten, issueEquipment, returnEquipment } from './sahajari/sahajari';
export { registerPushToken, onPostWritten, onRequestWritten } from './notify/notify';
export {
  auditMembers,
  auditBloodDonors,
  auditPatients,
  auditDonations,
  auditEquipment,
  auditCommittee,
  auditPosts,
  auditRequests,
  auditSettings,
  dailyBackup,
} from './audit/audit';
