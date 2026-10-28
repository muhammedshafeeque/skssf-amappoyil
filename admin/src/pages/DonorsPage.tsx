import { Alert, Button, Chip, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Tooltip } from '@mui/material';
import { Add, Download, Edit } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { BLOOD_GROUPS, DEFAULT_ELIGIBILITY_GAP_DAYS, DEFAULT_LOCATION, compatibleDonorGroups, donorEligibility, donorSchema, isLocalPlace, location } from '../shared';
import type { AppSettings, BloodDonor, BloodGroup } from '../shared';
import { CheckEl, SelectEl, TextEl } from '../components/form';
import { FormDialog, PageHeader, useToast } from '../components/ui';
import { useCan } from '../lib/auth';
import { errorMessage, stamp, useCollection, useDocument } from '../lib/data';
import type { WithId } from '../lib/data';
import { auth, db } from '../lib/firebase';
import { downloadCsv, today } from '../lib/files';
import { phoneInput, prettyPhone } from '../lib/phone';
import { useZodForm } from '../lib/useForm';

const nonMemberSchema = donorSchema.extend({ phone: phoneInput });
const memberDonorSchema = z.object({
  location,
  lastDonated: z.string().nullish().transform((v) => (v ? v : null)),
  available: z.boolean(),
  hideNumber: z.boolean(),
});

function DonorDialog({ open, onClose, donor }: { open: boolean; onClose: () => void; donor: WithId<BloodDonor> | null }) {
  const toast = useToast();
  const isMemberDonor = donor?.source === 'member';
  const schema = isMemberDonor ? memberDonorSchema : nonMemberSchema;
  const form = useZodForm(schema as typeof nonMemberSchema, {} as never);
  const { control, reset, submit, saving, error, setError } = form;

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      donor
        ? ({ ...donor, consent: donor.consent.given } as never)
        : ({ name: '', dob: '', bloodGroup: '', phone: '', location: { ...DEFAULT_LOCATION }, lastDonated: '', available: true, hideNumber: false, consent: false } as never),
    );
  }, [open, donor, reset, setError]);

  const onSubmit = submit(async (v) => {
    const values = v as z.infer<typeof nonMemberSchema>;
    const common = { location: values.location, isLocal: isLocalPlace(values.location.place), lastDonated: values.lastDonated, available: values.available, hideNumber: values.hideNumber };
    if (isMemberDonor) {
      await updateDoc(doc(db, 'bloodDonors', donor!.id), { ...common, ...stamp() });
    } else {
      const data = { ...common, source: 'non_member', memberId: null, name: values.name, nameLower: values.name.toLowerCase(), dob: values.dob, bloodGroup: values.bloodGroup, phone: values.phone, active: true };
      if (donor) await updateDoc(doc(db, 'bloodDonors', donor.id), { ...data, ...stamp() });
      else await addDoc(collection(db, 'bloodDonors'), { ...data, consent: { given: true, at: serverTimestamp(), recordedBy: auth.currentUser!.uid }, ...stamp(true) });
    }
    toast(donor ? 'Donor updated' : 'Donor added');
    onClose();
  });

  return (
    <FormDialog open={open} title={donor ? `Edit donor · ${donor.name}` : 'Add non-member donor'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} maxWidth="md">
      {isMemberDonor && <Alert severity="info">Name, phone, DOB and blood group come from the member record ({donor!.memberId}). Edit the member to change them.</Alert>}
      <Grid container spacing={2}>
        {!isMemberDonor && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="name" label="Name" required /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="phone" label="Phone" required /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><SelectEl control={control} name="bloodGroup" label="Blood group" options={BLOOD_GROUPS} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextEl control={control} name="dob" label="Date of birth" type="date" required /></Grid>
          </>
        )}
        <Grid size={{ xs: 6, sm: 3 }}><TextEl control={control} name="lastDonated" label="Last donated" type="date" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><TextEl control={control} name="location.place" label="Available at (place)" required helperText="Where they are now, e.g. Dubai if working abroad" /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><TextEl control={control} name="location.state" label="State" required /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><TextEl control={control} name="location.country" label="Country" required /></Grid>
        <Grid size={12}>
          <Stack direction="row" sx={{ flexWrap: 'wrap' }}>
            <CheckEl control={control} name="available" label="Available to donate" />
            <CheckEl control={control} name="hideNumber" label="Hide number from members" />
            {!isMemberDonor && <CheckEl control={control} name="consent" label="Donor agreed to be listed and contacted" />}
          </Stack>
        </Grid>
      </Grid>
    </FormDialog>
  );
}

export function DonorsPage() {
  const { isAdmin } = useCan();
  const toast = useToast();
  const { data, loading, error } = useCollection<BloodDonor>('bloodDonors');
  const { data: settings } = useDocument<AppSettings>('settings/app');
  const gap = settings?.eligibilityGapDays ?? DEFAULT_ELIGIBILITY_GAP_DAYS;
  const [group, setGroup] = useState<BloodGroup | ''>('');
  const [compatible, setCompatible] = useState(false);
  const [where, setWhere] = useState<'all' | 'local' | 'away'>('all');
  const [source, setSource] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<WithId<BloodDonor> | null | undefined>(undefined);

  const rows = useMemo(() => {
    const groups = group ? (compatible ? compatibleDonorGroups(group) : [group]) : null;
    const q = search.trim().toLowerCase();
    return data
      .map((d) => ({ ...d, elig: donorEligibility(d.lastDonated, gap) }))
      .filter((d) => !groups || groups.includes(d.bloodGroup))
      .filter((d) => where === 'all' || (where === 'local' ? d.isLocal : !d.isLocal))
      .filter((d) => !source || d.source === source)
      .filter((d) => !eligibleOnly || (d.elig.eligible && d.available && d.active))
      .filter((d) => !q || d.nameLower.includes(q) || d.location.place.toLowerCase().includes(q) || d.phone.includes(q))
      .sort((a, b) => Number(b.elig.eligible) - Number(a.elig.eligible) || a.nameLower.localeCompare(b.nameLower));
  }, [data, group, compatible, where, source, eligibleOnly, search, gap]);

  const toggleAvailable = async (d: WithId<BloodDonor>) => {
    try {
      await updateDoc(doc(db, 'bloodDonors', d.id), { available: !d.available, ...stamp() });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (d: WithId<BloodDonor>) => {
    if (!window.confirm(`Remove ${d.name} from the donor list?`)) return;
    await deleteDoc(doc(db, 'bloodDonors', d.id)).catch((err) => toast(errorMessage(err), 'error'));
  };

  type Row = (typeof rows)[number];
  const columns: GridColDef<Row>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'bloodGroup', headerName: 'Blood', width: 80, renderCell: (p) => <Chip size="small" color="secondary" label={p.value} /> },
    { field: 'phone', headerName: 'Phone', width: 150, valueFormatter: (v: string) => prettyPhone(v) },
    { field: 'place', headerName: 'Location', width: 170, valueGetter: (_v, r) => `${r.location.place}, ${r.location.country}` },
    { field: 'lastDonated', headerName: 'Last donated', width: 120 },
    {
      field: 'elig',
      headerName: 'Eligibility',
      width: 140,
      sortComparator: (a, b) => a.daysLeft - b.daysLeft,
      renderCell: (p) => (p.row.elig.eligible ? <Chip size="small" color="success" label="Can donate" /> : <Tooltip title={`From ${p.row.elig.eligibleFrom}`}><Chip size="small" label={`In ${p.row.elig.daysLeft} days`} /></Tooltip>),
    },
    { field: 'source', headerName: 'Source', width: 120, valueGetter: (_v, r) => (r.source === 'member' ? r.memberId : 'Non-member') },
    {
      field: 'available',
      headerName: 'Listed',
      width: 120,
      renderCell: (p) => (!p.row.active ? <Chip size="small" label="Member inactive" /> : isAdmin ? <Switch size="small" checked={p.row.available} onChange={() => toggleAvailable(p.row)} /> : p.row.available ? 'Yes' : 'No'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      sortable: false,
      renderCell: (p) =>
        isAdmin && (
          <>
            <Button size="small" startIcon={<Edit />} onClick={() => setEditing(p.row)}>Edit</Button>
            {p.row.source === 'non_member' && <Button size="small" color="error" onClick={() => remove(p.row)}>✕</Button>}
          </>
        ),
    },
  ];

  const exportCsv = () =>
    downloadCsv(
      `blood-donors-${today()}.csv`,
      rows.map((d) => ({
        Name: d.name,
        'Blood group': d.bloodGroup,
        Phone: d.phone,
        'Date of birth': d.dob,
        Place: d.location.place,
        State: d.location.state,
        Country: d.location.country,
        'Last donated': d.lastDonated,
        Eligible: d.elig.eligible ? 'Yes' : `From ${d.elig.eligibleFrom}`,
        Source: d.source === 'member' ? `Member ${d.memberId}` : 'Non-member',
        Available: d.available && d.active ? 'Yes' : 'No',
      })),
    );

  return (
    <>
      <PageHeader
        title="Blood donors"
        subtitle={`Members are added automatically · eligibility gap ${gap} days`}
        actions={
          <>
            <Button startIcon={<Download />} onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
            {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)}>Add non-member donor</Button>}
          </>
        }
      />
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' } }}>
          <TextField label="Search name, place, phone" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
          <TextField select label="Blood group" value={group} onChange={(e) => setGroup(e.target.value as BloodGroup)} sx={{ minWidth: 120 }}>
            <MenuItem value="">All</MenuItem>
            {BLOOD_GROUPS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Switch checked={compatible} onChange={(e) => setCompatible(e.target.checked)} disabled={!group} />} label="Compatible groups" />
          <TextField select label="Location" value={where} onChange={(e) => setWhere(e.target.value as never)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">Anywhere</MenuItem>
            <MenuItem value="local">In {DEFAULT_LOCATION.place}</MenuItem>
            <MenuItem value="away">Away</MenuItem>
          </TextField>
          <TextField select label="Source" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="member">Members</MenuItem>
            <MenuItem value="non_member">Non-members</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />} label="Can donate now" />
        </Stack>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          localeText={{ noRowsLabel: error ?? 'No donors match' }}
          sx={{ border: 'none' }}
        />
      </Paper>
      <DonorDialog open={editing !== undefined} donor={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
