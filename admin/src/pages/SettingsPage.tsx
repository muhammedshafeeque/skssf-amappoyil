import { Alert, Button, Grid, List, ListItem, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { DEFAULT_ELIGIBILITY_GAP_DAYS, DEFAULT_LOCATION, STAFF_ROLES, settingsSchema } from '../shared';
import type { AppSettings, StaffRole, StaffUser } from '../shared';
import { TextEl } from '../components/form';
import { PageHeader, useToast } from '../components/ui';
import { useCan } from '../lib/auth';
import { callFn, errorMessage, stamp, useCollection, useDocument } from '../lib/data';
import { db } from '../lib/firebase';
import { label } from '../lib/labels';
import { useZodForm } from '../lib/useForm';

function AppSettingsCard() {
  const toast = useToast();
  const { data, loading } = useDocument<AppSettings>('settings/app');
  const { control, reset, submit, saving, error } = useZodForm(settingsSchema, {} as never);
  useEffect(() => {
    if (!loading) reset((data ?? { eligibilityGapDays: DEFAULT_ELIGIBILITY_GAP_DAYS, defaultLocation: { ...DEFAULT_LOCATION }, unitName: 'Amappoyil' }) as never);
  }, [loading, data, reset]);
  const onSubmit = submit(async (v) => {
    await setDoc(doc(db, 'settings', 'app'), { ...v, ...stamp() }, { merge: true });
    toast('Settings saved');
  });
  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={onSubmit} noValidate>
        <Typography variant="h6" sx={{ mb: 2 }}>Unit settings</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="unitName" label="Unit name" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="eligibilityGapDays" label="Days between donations" number helperText="Donors are shown as eligible after this many days" /></Grid>
          <Grid size={12}><Typography variant="body2" color="text.secondary">Default donor location (new members)</Typography></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextEl control={control} name="defaultLocation.place" label="Place" /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><TextEl control={control} name="defaultLocation.state" label="State" /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><TextEl control={control} name="defaultLocation.country" label="Country" /></Grid>
        </Grid>
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={saving}>Save</Button>
      </form>
    </Paper>
  );
}

function StaffCard() {
  const toast = useToast();
  const { data } = useCollection<StaffUser>('staff');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (payload: Record<string, unknown>, msg: string) => {
    setBusy(true);
    setError(null);
    try {
      await callFn('setStaffRole', payload);
      toast(msg);
      setEmail('');
      setName('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6">Staff access</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        New people get an account with no password — tell them to use “Forgot password” on the sign-in page.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ flex: 1 }} />
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1 }} />
        <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} sx={{ minWidth: 200 }}>
          {STAFF_ROLES.map((r) => <MenuItem key={r} value={r}>{label(r)}</MenuItem>)}
        </TextField>
        <Button variant="contained" disabled={busy || !email} onClick={() => change({ email, displayName: name || undefined, role }, `${email} is now ${label(role)}`)}>
          Grant
        </Button>
      </Stack>
      <List>
        {data.filter((s) => s.role).map((s) => (
          <ListItem key={s.id} divider secondaryAction={<Button color="error" size="small" disabled={busy} onClick={() => window.confirm(`Remove ${s.email}'s access?`) && change({ uid: s.id, role: null }, 'Access removed')}>Remove</Button>}>
            <ListItemText primary={`${s.displayName ?? ''} ${s.email ?? ''}`} secondary={label(s.role)} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export function SettingsPage() {
  const { isSuperAdmin } = useCan();
  return (
    <>
      <PageHeader title="Settings" />
      <Stack spacing={2}>
        <AppSettingsCard />
        {isSuperAdmin && <StaffCard />}
      </Stack>
    </>
  );
}
