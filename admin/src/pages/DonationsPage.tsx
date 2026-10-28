import { Button, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Add, Download, Edit } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { DONATION_DIRECTIONS, DONATION_MODES, donationSchema } from '../shared';
import type { Donation, Patient } from '../shared';
import { CheckEl, SelectEl, TextEl } from '../components/form';
import { FormDialog, PageHeader, useToast } from '../components/ui';
import { stamp, useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { db } from '../lib/firebase';
import { downloadCsv, today } from '../lib/files';
import { label, rupees } from '../lib/labels';
import { useZodForm } from '../lib/useForm';

function DonationDialog({ open, onClose, item, patients }: { open: boolean; onClose: () => void; item: WithId<Donation> | null; patients: WithId<Patient>[] }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError, watch } = useZodForm(donationSchema, {} as never);
  const direction = watch('direction');
  const anonymous = watch('anonymous');

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      item
        ? ({ ...item, donorName: item.donorName ?? '', item: item.item ?? '', patientId: item.patientId ?? '', receiptNo: item.receiptNo ?? '' } as never)
        : ({ direction: 'in', donorName: '', anonymous: false, amount: null, item: '', mode: 'cash', date: today(), purpose: '', patientId: '', receiptNo: '' } as never),
    );
  }, [open, item, reset, setError]);

  const onSubmit = submit(async (values) => {
    const patientName = patients.find((p) => p.id === values.patientId)?.name ?? null;
    const data = { ...values, donorName: values.anonymous ? null : values.donorName, patientName };
    if (item) await updateDoc(doc(db, 'donations', item.id), { ...data, ...stamp() });
    else await addDoc(collection(db, 'donations'), { ...data, ...stamp(true) });
    toast(item ? 'Entry updated' : 'Entry recorded');
    onClose();
  });

  return (
    <FormDialog open={open} title={item ? 'Edit entry' : 'Record donation or support'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} maxWidth="md">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectEl control={control} name="direction" label="Type" options={[{ value: 'in', label: 'Donation received' }, { value: 'out', label: 'Support given to patient' }]} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}><TextEl control={control} name="date" label="Date" type="date" required /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><SelectEl control={control} name="mode" label="Mode" options={DONATION_MODES} /></Grid>
        {direction === 'in' && (
          <>
            <Grid size={{ xs: 12, sm: 8 }}><TextEl control={control} name="donorName" label="Donor name" disabled={Boolean(anonymous)} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><CheckEl control={control} name="anonymous" label="Anonymous" /></Grid>
          </>
        )}
        <Grid size={{ xs: 12, sm: 4 }}><TextEl control={control} name="amount" label="Amount (₹)" number /></Grid>
        <Grid size={{ xs: 12, sm: 8 }}><TextEl control={control} name="item" label="Or item (in kind)" helperText="e.g. Rice 25 kg, adult diapers" /></Grid>
        <Grid size={{ xs: 12, sm: 8 }}><TextEl control={control} name="purpose" label="Purpose" required helperText="e.g. General fund, dialysis support, Ramadan collection" /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><TextEl control={control} name="receiptNo" label="Receipt no." /></Grid>
        <Grid size={12}>
          <SelectEl
            control={control}
            name="patientId"
            label={direction === 'out' ? 'Patient (required)' : 'For patient (optional)'}
            allowEmpty
            options={patients.map((p) => ({ value: p.id, label: `${p.name} · ${label(p.category)}` }))}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
}

export function DonationsPage() {
  const { data, loading } = useCollection<Donation>('donations');
  const patients = useCollection<Patient>('patients');
  const [direction, setDirection] = useState('');
  const [mode, setMode] = useState('');
  const [month, setMonth] = useState('');
  const [patient, setPatient] = useState('');
  const [editing, setEditing] = useState<WithId<Donation> | null | undefined>(undefined);

  const rows = useMemo(
    () =>
      data
        .filter((d) => !direction || d.direction === direction)
        .filter((d) => !mode || d.mode === mode)
        .filter((d) => !month || d.date.startsWith(month))
        .filter((d) => !patient || d.patientId === patient)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data, direction, mode, month, patient],
  );

  const monthly = useMemo(() => {
    const m = new Map<string, { in: number; out: number; byMode: Record<string, number> }>();
    data.forEach((d) => {
      const key = d.date.slice(0, 7);
      const e = m.get(key) ?? { in: 0, out: 0, byMode: {} };
      e[d.direction] += d.amount ?? 0;
      if (d.direction === 'in') e.byMode[d.mode] = (e.byMode[d.mode] ?? 0) + (d.amount ?? 0);
      m.set(key, e);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [data]);

  const totalIn = rows.filter((d) => d.direction === 'in').reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalOut = rows.filter((d) => d.direction === 'out').reduce((s, d) => s + (d.amount ?? 0), 0);

  const columns: GridColDef<WithId<Donation>>[] = [
    { field: 'date', headerName: 'Date', width: 110 },
    { field: 'direction', headerName: 'Type', width: 100, valueFormatter: (v: string) => label(v) },
    { field: 'who', headerName: 'Donor / patient', flex: 1, minWidth: 170, valueGetter: (_v, r) => (r.direction === 'in' ? (r.anonymous ? 'Anonymous' : r.donorName) : r.patientName) },
    { field: 'amount', headerName: 'Amount', width: 110, valueFormatter: (v: number | null) => rupees(v) },
    { field: 'item', headerName: 'Item', width: 150 },
    { field: 'mode', headerName: 'Mode', width: 90, valueFormatter: (v: string) => label(v) },
    { field: 'purpose', headerName: 'Purpose', flex: 1, minWidth: 160 },
    { field: 'patientName', headerName: 'Patient', width: 140 },
    { field: 'receiptNo', headerName: 'Receipt', width: 90 },
    { field: 'edit', headerName: '', width: 70, sortable: false, renderCell: (p) => <Button size="small" onClick={() => setEditing(p.row)}><Edit fontSize="small" /></Button> },
  ];

  const exportCsv = () =>
    downloadCsv(
      `donations-${month || today()}.csv`,
      rows.map((d) => ({
        Date: d.date,
        Type: label(d.direction),
        Donor: d.direction === 'in' ? (d.anonymous ? 'Anonymous' : d.donorName) : '',
        Amount: d.amount,
        Item: d.item,
        Mode: label(d.mode),
        Purpose: d.purpose,
        Patient: d.patientName,
        Receipt: d.receiptNo,
      })),
    );

  return (
    <>
      <PageHeader
        title="Donations"
        subtitle={`Shown: received ${rupees(totalIn)} · given ${rupees(totalOut)}`}
        actions={
          <>
            <Button startIcon={<Download />} onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)}>Record entry</Button>
          </>
        }
      />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField select label="Type" value={direction} onChange={(e) => setDirection(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            {DONATION_DIRECTIONS.map((d) => <MenuItem key={d} value={d}>{label(d)}</MenuItem>)}
          </TextField>
          <TextField select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">All</MenuItem>
            {DONATION_MODES.map((d) => <MenuItem key={d} value={d}>{label(d)}</MenuItem>)}
          </TextField>
          <TextField label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label="Patient" value={patient} onChange={(e) => setPatient(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All</MenuItem>
            {patients.data.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </Stack>
        <DataGrid rows={rows} columns={columns} loading={loading} autoHeight disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50, 100]} sx={{ border: 'none' }} />
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Monthly totals</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Received</TableCell>
              {DONATION_MODES.filter((m) => m !== 'in_kind').map((m) => <TableCell key={m} align="right">{label(m)}</TableCell>)}
              <TableCell align="right">Given</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthly.map(([m, t]) => (
              <TableRow key={m} hover onClick={() => setMonth(m)} sx={{ cursor: 'pointer' }}>
                <TableCell>{m}</TableCell>
                <TableCell align="right">{rupees(t.in)}</TableCell>
                {DONATION_MODES.filter((x) => x !== 'in_kind').map((x) => <TableCell key={x} align="right">{rupees(t.byMode[x] ?? 0)}</TableCell>)}
                <TableCell align="right">{rupees(t.out)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <DonationDialog open={editing !== undefined} item={editing ?? null} onClose={() => setEditing(undefined)} patients={patients.data.filter((p) => p.status !== 'pending')} />
    </>
  );
}
