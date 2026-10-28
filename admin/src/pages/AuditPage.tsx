import { Box, Dialog, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { limit, orderBy, where } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { AuditLog, StaffUser } from '../shared';
import { PageHeader } from '../components/ui';
import { useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { formatTs, label } from '../lib/labels';

const COLLECTIONS = ['members', 'bloodDonors', 'patients', 'donations', 'equipment', 'committee', 'posts', 'requests', 'settings'];

export function AuditPage() {
  const [col, setCol] = useState('');
  const logs = useCollection<AuditLog>('auditLogs', col ? [where('collection', '==', col), orderBy('at', 'desc'), limit(500)] : [orderBy('at', 'desc'), limit(500)], col);
  const staff = useCollection<StaffUser>('staff');
  const [actor, setActor] = useState('');
  const [open, setOpen] = useState<WithId<AuditLog> | null>(null);

  const who = (uid: string) => {
    if (uid === 'system') return 'System';
    const s = staff.data.find((x) => x.id === uid);
    return s ? (s.displayName ?? s.email ?? uid) : uid.length > 12 ? `Member app (${uid.slice(0, 6)}…)` : uid;
  };

  const rows = useMemo(() => logs.data.filter((l) => !actor || l.actor === actor), [logs.data, actor]);
  const columns: GridColDef<WithId<AuditLog>>[] = [
    { field: 'at', headerName: 'When', width: 180, valueFormatter: (v: AuditLog['at']) => formatTs(v) },
    { field: 'actor', headerName: 'Who', width: 200, valueFormatter: (v: string) => who(v) },
    { field: 'action', headerName: 'Action', width: 100, valueFormatter: (v: string) => label(v) },
    { field: 'collection', headerName: 'Collection', width: 130 },
    { field: 'docId', headerName: 'Record', width: 180 },
    { field: 'changed', headerName: 'Fields', flex: 1, minWidth: 200, valueFormatter: (v: string[]) => v.join(', ') },
  ];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change to unit records — latest 500" />
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <TextField select label="Collection" value={col} onChange={(e) => setCol(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            {COLLECTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select label="Who" value={actor} onChange={(e) => setActor(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Everyone</MenuItem>
            {[...new Set(logs.data.map((l) => l.actor))].map((a) => <MenuItem key={a} value={a}>{who(a)}</MenuItem>)}
          </TextField>
        </Stack>
        <DataGrid rows={rows} columns={columns} loading={logs.loading} autoHeight disableRowSelectionOnClick onRowClick={(p) => setOpen(p.row)} initialState={{ pagination: { paginationModel: { pageSize: 50 } } }} pageSizeOptions={[50, 100]} sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
      </Paper>
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} fullWidth maxWidth="md">
        <DialogTitle>{open && `${label(open.action)} ${open.collection}/${open.docId}`}</DialogTitle>
        <DialogContent>
          {open && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {(['before', 'after'] as const).map((k) => (
                <Box key={k} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="overline">{k}</Typography>
                  <Box component="pre" sx={{ fontSize: 12, bgcolor: '#f5f5f5', p: 1, borderRadius: 1, overflow: 'auto', maxHeight: 400 }}>
                    {JSON.stringify(
                      Object.fromEntries(Object.entries(open[k] ?? {}).filter(([f]) => open.changed.includes(f) || open.action !== 'update')),
                      (_key, v) => (v && typeof v === 'object' && 'seconds' in v && 'nanoseconds' in v ? new Date(v.seconds * 1000).toISOString() : v),
                      2,
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
