import { Alert, Button, Chip, Dialog, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { addDoc, collection, doc, orderBy, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { EQUIPMENT_CONDITIONS, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, equipmentSchema, issueEquipmentSchema, returnEquipmentSchema } from '../shared';
import type { Assignment, Equipment, EquipmentStatus, Patient } from '../shared';
import { SelectEl, TextEl } from '../components/form';
import { FormDialog, PageHeader, StatusChip, useToast } from '../components/ui';
import { callFn, errorMessage, stamp, useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { db } from '../lib/firebase';
import { today } from '../lib/files';
import { label, rupees } from '../lib/labels';
import { phoneInput, prettyPhone } from '../lib/phone';
import { useZodForm } from '../lib/useForm';

function ItemDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: WithId<Equipment> | null }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError } = useZodForm(equipmentSchema, {} as never);
  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(item ? ({ ...item, notes: item.notes ?? '' } as never) : ({ code: '', type: 'wheelchair', name: '', condition: 'good', notes: '' } as never));
  }, [open, item, reset, setError]);
  const onSubmit = submit(async (v) => {
    if (item) await updateDoc(doc(db, 'equipment', item.id), { ...v, ...stamp() });
    else await addDoc(collection(db, 'equipment'), { ...v, status: 'available', currentAssignment: null, ...stamp(true) });
    toast(item ? 'Saved' : 'Item added');
    onClose();
  });
  return (
    <FormDialog open={open} title={item ? `Edit ${item.code}` : 'Add equipment'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error}>
      <Stack direction="row" spacing={2}>
        <TextEl control={control} name="code" label="Code" required helperText="e.g. WC-01" />
        <SelectEl control={control} name="type" label="Type" options={EQUIPMENT_TYPES} />
      </Stack>
      <TextEl control={control} name="name" label="Name / description" required />
      <SelectEl control={control} name="condition" label="Condition" options={EQUIPMENT_CONDITIONS} />
      <TextEl control={control} name="notes" label="Notes" multiline minRows={2} />
    </FormDialog>
  );
}

const issueForm = issueEquipmentSchema.extend({ phone: phoneInput });

function IssueDialog({ item, onClose, patients }: { item: WithId<Equipment> | null; onClose: () => void; patients: WithId<Patient>[] }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError, watch, setValue } = useZodForm(issueForm, {} as never);
  const patientId = watch('patientId');
  useEffect(() => {
    if (!item) return;
    setError(null);
    reset({ equipmentId: item.id, patientId: '', issuedTo: '', phone: '', issuedAt: today(), expectedReturn: '', deposit: null, notes: '' } as never);
  }, [item, reset, setError]);
  useEffect(() => {
    const p = patients.find((x) => x.id === patientId);
    if (p) {
      setValue('issuedTo', p.name);
      setValue('phone', p.phone);
    }
  }, [patientId, patients, setValue]);
  const onSubmit = submit(async (v) => {
    await callFn('issueEquipment', v);
    toast(`${item!.code} issued`);
    onClose();
  });
  return (
    <FormDialog open={Boolean(item)} title={`Issue ${item?.code ?? ''} · ${item?.name ?? ''}`} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} submitLabel="Issue">
      {item?.type === 'ambulance' && <Alert severity="info">Log an ambulance trip as a short issue and return it the same day.</Alert>}
      <SelectEl control={control} name="patientId" label="Patient" options={patients.map((p) => ({ value: p.id, label: `${p.name} · ${label(p.status)}` }))} />
      <Stack direction="row" spacing={2}>
        <TextEl control={control} name="issuedTo" label="Handed to" required />
        <TextEl control={control} name="phone" label="Phone" required />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextEl control={control} name="issuedAt" label="Issue date" type="date" required />
        <TextEl control={control} name="expectedReturn" label="Expected return" type="date" />
      </Stack>
      <TextEl control={control} name="deposit" label="Deposit (₹)" number />
      <TextEl control={control} name="notes" label="Notes" multiline minRows={2} />
    </FormDialog>
  );
}

function ReturnDialog({ item, onClose }: { item: WithId<Equipment> | null; onClose: () => void }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError } = useZodForm(returnEquipmentSchema, {} as never);
  useEffect(() => {
    if (!item) return;
    setError(null);
    reset({ equipmentId: item.id, returnedAt: today(), condition: item.condition, notes: '' } as never);
  }, [item, reset, setError]);
  const onSubmit = submit(async (v) => {
    const res = await callFn<{ status: string }>('returnEquipment', v);
    toast(`${item!.code} returned · now ${label(res.status).toLowerCase()}`);
    onClose();
  });
  return (
    <FormDialog open={Boolean(item)} title={`Return ${item?.code ?? ''} from ${item?.currentAssignment?.patientName ?? ''}`} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} submitLabel="Record return">
      <TextEl control={control} name="returnedAt" label="Returned on" type="date" required />
      <SelectEl control={control} name="condition" label="Condition on return" options={EQUIPMENT_CONDITIONS} />
      <TextEl control={control} name="notes" label="Notes (deposit refund, damage…)" multiline minRows={2} />
    </FormDialog>
  );
}

function HistoryDialog({ item, onClose }: { item: WithId<Equipment> | null; onClose: () => void }) {
  const history = useCollection<Assignment>(item ? `equipment/${item.id}/assignments` : 'equipment/_/assignments', [orderBy('createdAt', 'desc')], item?.id ?? '');
  return (
    <Dialog open={Boolean(item)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>History · {item?.code} {item?.name}</DialogTitle>
      <DialogContent>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Handed to</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Expected</TableCell>
              <TableCell>Returned</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Deposit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.data.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.patientName}</TableCell>
                <TableCell>{a.issuedTo}<br />{prettyPhone(a.phone)}</TableCell>
                <TableCell>{a.issuedAt}</TableCell>
                <TableCell>{a.expectedReturn}</TableCell>
                <TableCell>{a.returnedAt ?? <Chip size="small" color="info" label="With patient" />}</TableCell>
                <TableCell>{label(a.returnCondition)}</TableCell>
                <TableCell>{rupees(a.deposit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

export function EquipmentPage() {
  const toast = useToast();
  const { data, loading } = useCollection<Equipment>('equipment');
  const patients = useCollection<Patient>('patients');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<WithId<Equipment> | null | undefined>(undefined);
  const [issuing, setIssuing] = useState<WithId<Equipment> | null>(null);
  const [returning, setReturning] = useState<WithId<Equipment> | null>(null);
  const [history, setHistory] = useState<WithId<Equipment> | null>(null);

  const rows = useMemo(() => data.filter((e) => !type || e.type === type).filter((e) => !status || e.status === status).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), [data, type, status]);
  const overdue = (e: Equipment) => e.currentAssignment?.expectedReturn && e.currentAssignment.expectedReturn < today();

  const setManualStatus = async (e: WithId<Equipment>, s: EquipmentStatus) => {
    try {
      await updateDoc(doc(db, 'equipment', e.id), { status: z.enum(['available', 'maintenance', 'retired']).parse(s), ...stamp() });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const columns: GridColDef<WithId<Equipment>>[] = [
    { field: 'code', headerName: 'Code', width: 90 },
    { field: 'type', headerName: 'Type', width: 140, valueFormatter: (v: string) => label(v) },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'condition', headerName: 'Condition', width: 120, valueFormatter: (v: string) => label(v) },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip value={p.value} /> },
    {
      field: 'holder',
      headerName: 'With',
      flex: 1,
      minWidth: 200,
      valueGetter: (_v, r) => r.currentAssignment?.patientName ?? '',
      renderCell: (p) =>
        p.row.currentAssignment ? (
          <span>
            {p.row.currentAssignment.patientName} · since {p.row.currentAssignment.issuedAt}{' '}
            {overdue(p.row) && <Chip size="small" color="error" label="Overdue" />}
          </span>
        ) : (
          ''
        ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 300,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
          {p.row.status === 'available' && <Button size="small" variant="contained" onClick={() => setIssuing(p.row)}>Issue</Button>}
          {p.row.status === 'assigned' && <Button size="small" variant="contained" color="secondary" onClick={() => setReturning(p.row)}>Return</Button>}
          {p.row.status !== 'assigned' && (
            <TextField select size="small" value="" onChange={(e) => setManualStatus(p.row, e.target.value as EquipmentStatus)} sx={{ width: 110 }} slotProps={{ select: { displayEmpty: true, renderValue: () => 'Set status' } }}>
              {(['available', 'maintenance', 'retired'] as const).filter((s) => s !== p.row.status).map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
            </TextField>
          )}
          <Button size="small" onClick={() => setHistory(p.row)}>History</Button>
          <Button size="small" onClick={() => setEditing(p.row)}>Edit</Button>
        </Stack>
      ),
    },
  ];

  const counts = EQUIPMENT_STATUSES.map((s) => `${data.filter((e) => e.status === s).length} ${label(s).toLowerCase()}`).join(' · ');

  return (
    <>
      <PageHeader title="Equipment" subtitle={counts} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)}>Add equipment</Button>} />
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            {EQUIPMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{label(t)} ({data.filter((e) => e.type === t).length})</MenuItem>)}
          </TextField>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            {EQUIPMENT_STATUSES.map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
          </TextField>
        </Stack>
        <DataGrid rows={rows} columns={columns} loading={loading} autoHeight disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]} sx={{ border: 'none' }} />
      </Paper>
      <ItemDialog open={editing !== undefined} item={editing ?? null} onClose={() => setEditing(undefined)} />
      <IssueDialog item={issuing} onClose={() => setIssuing(null)} patients={patients.data.filter((p) => p.status === 'approved' || p.status === 'active')} />
      <ReturnDialog item={returning} onClose={() => setReturning(null)} />
      <HistoryDialog item={history} onClose={() => setHistory(null)} />
    </>
  );
}
