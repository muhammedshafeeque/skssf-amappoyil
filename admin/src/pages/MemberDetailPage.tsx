import { Alert, Avatar, Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Edit, PhotoCamera } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MEMBER_STATUSES, ageFrom, donorEligibility } from '../shared';
import type { AppSettings, BloodDonor, Member, MemberStatus } from '../shared';
import { MemberFormDialog } from '../components/MemberFormDialog';
import { Field, FormDialog, PageHeader, StatusChip, useToast } from '../components/ui';
import { useCan } from '../lib/auth';
import { callFn, errorMessage, useDocument } from '../lib/data';
import { uploadImage } from '../lib/files';
import { formatTs, label } from '../lib/labels';
import { prettyPhone } from '../lib/phone';

export function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useCan();
  const { data: m, loading } = useDocument<Member>(`members/${id}`);
  const { data: donor } = useDocument<BloodDonor>(`bloodDonors/${id}`);
  const { data: settings } = useDocument<AppSettings>('settings/app');
  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [status, setStatus] = useState<MemberStatus>('active');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!m) return <Alert severity="warning">Member {id} not found.</Alert>;

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(`members/${m.memberId}/photo.jpg`, file, { max: 512, square: true });
      await callFn('updateMember', { memberId: m.memberId, changes: { photoUrl: url } });
      toast('Photo updated');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveStatus = async () => {
    setBusy(true);
    setError(null);
    try {
      await callFn('setMemberStatus', { memberId: m.memberId, status, reason: reason || null });
      toast(status === 'active' ? 'Member activated' : `Member ${label(status).toLowerCase()} and signed out of the app`);
      setStatusOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const elig = donor ? donorEligibility(donor.lastDonated, settings?.eligibilityGapDays) : null;

  return (
    <>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/members')} sx={{ mb: 1 }}>
        Members
      </Button>
      <PageHeader
        title={m.name}
        subtitle={`${m.memberId}${m.skssfId ? ` · SKSSF ${m.skssfId}` : ''}`}
        actions={
          isAdmin && (
            <>
              <Button
                onClick={() => {
                  setStatus(m.status === 'active' ? 'inactive' : 'active');
                  setReason('');
                  setError(null);
                  setStatusOpen(true);
                }}
              >
                Change status
              </Button>
              <Button variant="contained" startIcon={<Edit />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )
        }
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar src={m.photoUrl ?? undefined} sx={{ width: 128, height: 128, mx: 'auto', mb: 2, fontSize: 48 }}>
              {m.name[0]}
            </Avatar>
            {isAdmin && (
              <Button component="label" size="small" startIcon={<PhotoCamera />} disabled={busy}>
                {busy ? 'Uploading…' : m.photoUrl ? 'Change photo' : 'Add photo'}
                <input hidden type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </Button>
            )}
            <Stack spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
              <StatusChip value={m.status} />
              {m.statusReason && (
                <Typography variant="caption" color="text.secondary">
                  {m.statusReason}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                App login: {m.authUid ? 'linked' : 'not yet logged in'}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}><Field name="Phone" value={prettyPhone(m.phone)} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="Blood group" value={m.bloodGroup} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="Date of birth" value={`${m.dob} (${ageFrom(m.dob)} yrs)`} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="Father's name" value={m.fatherName} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="House name" value={m.houseName} /></Grid>
              <Grid size={{ xs: 12 }}><Field name="Address" value={m.address} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="Created" value={formatTs(m.createdAt)} /></Grid>
              <Grid size={{ xs: 6 }}><Field name="Last updated" value={formatTs(m.updatedAt)} /></Grid>
            </Grid>
          </Paper>
          {donor && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Blood donor record</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
                <Field name="Location" value={`${donor.location.place}, ${donor.location.state}, ${donor.location.country}`} />
                <Field name="Last donated" value={donor.lastDonated ?? 'Never recorded'} />
                <Field name="Eligibility" value={elig?.eligible ? 'Can donate' : `In ${elig?.daysLeft} days (${elig?.eligibleFrom})`} />
                <Field name="Shown to members" value={donor.active ? (donor.available ? 'Yes' : 'Marked unavailable') : 'No (member not active)'} />
                <Field name="Number" value={donor.hideNumber ? 'Hidden from members' : 'Visible to members'} />
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
      <MemberFormDialog open={editing} onClose={() => setEditing(false)} member={m} />
      <FormDialog open={statusOpen} title={`Status of ${m.memberId}`} onClose={() => setStatusOpen(false)} onSubmit={saveStatus} submitting={busy} error={error}>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>
          {MEMBER_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {label(s)}
            </MenuItem>
          ))}
        </TextField>
        {status !== 'active' && (
          <>
            <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required multiline minRows={2} />
            <Alert severity="info">The member is signed out of the app and hidden from the donor list.</Alert>
          </>
        )}
      </FormDialog>
    </>
  );
}
