import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { where } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REQUEST_STATUSES, SAHAJARI_REQUEST_TYPES } from '../shared';
import type { RequestDoc } from '../shared';
import { Field, PageHeader, StatusChip, useToast } from '../components/ui';
import { useCan } from '../lib/auth';
import { callFn, errorMessage, useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { formatTs, label } from '../lib/labels';
import { prettyPhone } from '../lib/phone';

function ReviewDialog({ req, onClose }: { req: WithId<RequestDoc> | null; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!req) return null;
  const p = req.payload;

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      const res = await callFn<{ resultRef: string | null }>('reviewRequest', { requestId: req.id, decision, note: note || null });
      toast(decision === 'approve' ? 'Approved — patient added' : 'Request rejected');
      setNote('');
      onClose();
      if (res.resultRef) navigate(`/${res.resultRef}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {label(req.type)} · from {req.requestedBy.name} ({req.requestedBy.memberId})
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={6}><Field name="Patient" value={`${p.name}, ${p.age} yrs, ${label(p.gender)}`} /></Grid>
          <Grid size={6}><Field name="Phone" value={prettyPhone(p.phone)} /></Grid>
          <Grid size={12}><Field name="Address" value={p.address} /></Grid>
          <Grid size={12}><Field name="Condition" value={p.condition} /></Grid>
          <Grid size={12}><Field name="Support needed" value={p.need} /></Grid>
          <Grid size={6}><Field name="Category" value={label(p.category)} /></Grid>
          <Grid size={6}><Field name="Support types" value={p.supportTypes.map(label).join(', ')} /></Grid>
          <Grid size={6}><Field name="Relation to requester" value={p.relation} /></Grid>
          <Grid size={6}><Field name="Submitted" value={formatTs(req.createdAt)} /></Grid>
          <Grid size={12}><Field name="Note from member" value={p.note} /></Grid>
        </Grid>
        {req.status === 'pending' ? (
          <TextField sx={{ mt: 3 }} fullWidth label="Note to the member (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        ) : (
          <Box sx={{ mt: 3 }}>
            <StatusChip value={req.status} /> {req.review?.note && <Typography variant="body2" sx={{ mt: 1 }}>{req.review.note}</Typography>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {req.status === 'pending' && (
          <>
            <Button color="error" onClick={() => decide('reject')} disabled={busy}>Reject</Button>
            <Button variant="contained" onClick={() => decide('approve')} disabled={busy}>Approve</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export function RequestsPage() {
  const { isAdmin } = useCan();
  const { data, loading, error } = useCollection<RequestDoc>('requests', isAdmin ? [] : [where('type', 'in', [...SAHAJARI_REQUEST_TYPES])], `req-${isAdmin}`);
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState<WithId<RequestDoc> | null>(null);

  const rows = useMemo(
    () => data.filter((r) => !status || r.status === status).sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, status],
  );

  const columns: GridColDef<WithId<RequestDoc>>[] = [
    { field: 'createdAt', headerName: 'Submitted', width: 170, valueFormatter: (v: RequestDoc['createdAt']) => formatTs(v) },
    { field: 'type', headerName: 'Type', width: 120, renderCell: (p) => <Chip size="small" label={label(p.value)} /> },
    { field: 'who', headerName: 'From', width: 200, valueGetter: (_v, r) => `${r.requestedBy.name} (${r.requestedBy.memberId})` },
    { field: 'summary', headerName: 'Details', flex: 1, minWidth: 200, valueGetter: (_v, r) => `${r.payload.name} — ${r.payload.need}` },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip value={p.value} /> },
  ];

  return (
    <>
      <PageHeader title="Requests" subtitle={isAdmin ? 'Member requests waiting for a decision' : 'Sahajari requests'} />
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" sx={{ mb: 2 }}>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            {REQUEST_STATUSES.map((s) => <MenuItem key={s} value={s}>{label(s)} ({data.filter((r) => r.status === s).length})</MenuItem>)}
          </TextField>
        </Stack>
        <DataGrid rows={rows} columns={columns} loading={loading} autoHeight disableRowSelectionOnClick onRowClick={(p) => setOpen(p.row)} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]} localeText={{ noRowsLabel: error ?? 'Nothing here' }} sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
      </Paper>
      <ReviewDialog req={open} onClose={() => setOpen(null)} />
    </>
  );
}
