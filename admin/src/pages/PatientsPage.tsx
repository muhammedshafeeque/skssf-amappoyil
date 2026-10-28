import { Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATIENT_CATEGORIES, PATIENT_STATUSES, SUPPORT_TYPES } from '../shared';
import type { Patient } from '../shared';
import { PatientFormDialog } from '../components/PatientFormDialog';
import { PageHeader, StatusChip } from '../components/ui';
import { useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { formatTs, label, rupees } from '../lib/labels';

export function PatientsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useCollection<Patient>('patients');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [support, setSupport] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(
    () =>
      data
        .filter((p) => !status || p.status === status)
        .filter((p) => !category || p.category === category)
        .filter((p) => !support || p.supportTypes?.includes(support as never))
        .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, status, category, support, search],
  );

  const columns: GridColDef<WithId<Patient>>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'age', headerName: 'Age', width: 70 },
    { field: 'category', headerName: 'Category', width: 170, valueFormatter: (v: string) => label(v) },
    { field: 'need', headerName: 'Need', flex: 1, minWidth: 180 },
    { field: 'supportTypes', headerName: 'Support', width: 170, valueFormatter: (v: string[]) => (v ?? []).map(label).join(', ') },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip value={p.value} /> },
    { field: 'received', headerName: 'Received', width: 110, valueGetter: (_v, r) => r.totals?.received ?? 0, valueFormatter: (v: number) => rupees(v) },
    { field: 'source', headerName: 'Added via', width: 110, valueFormatter: (v: string) => (v === 'request' ? 'Member request' : 'Admin') },
    { field: 'createdAt', headerName: 'Registered', width: 160, valueFormatter: (v: Patient['createdAt']) => formatTs(v) },
  ];

  const filter = (lbl: string, value: string, set: (v: string) => void, opts: readonly string[]) => (
    <TextField select label={lbl} value={value} onChange={(e) => set(e.target.value)} sx={{ minWidth: 150 }}>
      <MenuItem value="">All</MenuItem>
      {opts.map((o) => (
        <MenuItem key={o} value={o}>{label(o)}</MenuItem>
      ))}
    </TextField>
  );

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Sahajari support register — members only see name, need and status of approved/active patients"
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Register patient</Button>}
      />
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField label="Search name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
          {filter('Status', status, setStatus, PATIENT_STATUSES)}
          {filter('Category', category, setCategory, PATIENT_CATEGORIES)}
          {filter('Support type', support, setSupport, SUPPORT_TYPES)}
        </Stack>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(p) => navigate(`/patients/${p.id}`)}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          localeText={{ noRowsLabel: error ?? 'No patients' }}
          sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
      <PatientFormDialog open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(`/patients/${id}`)} />
    </>
  );
}
