import { Avatar, Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { Add, Download } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOOD_GROUPS, MEMBER_STATUSES } from '../shared';
import type { Member } from '../shared';
import { MemberFormDialog } from '../components/MemberFormDialog';
import { PageHeader, StatusChip } from '../components/ui';
import { useCan } from '../lib/auth';
import { useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { downloadCsv, today } from '../lib/files';
import { label } from '../lib/labels';
import { prettyPhone } from '../lib/phone';

export function MembersPage() {
  const { isAdmin } = useCan();
  const navigate = useNavigate();
  const { data, loading, error } = useCollection<Member>('members');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return data
      .filter((m) => !status || m.status === status)
      .filter((m) => !group || m.bloodGroup === group)
      .filter(
        (m) =>
          !q ||
          m.nameLower.includes(q) ||
          m.memberId.toLowerCase().includes(q) ||
          (m.skssfId ?? '').toLowerCase().includes(q) ||
          (digits.length >= 3 && m.phone.includes(digits)) ||
          m.houseName.toLowerCase().includes(q),
      )
      .sort((a, b) => a.memberId.localeCompare(b.memberId, undefined, { numeric: true }));
  }, [data, search, status, group]);

  const columns: GridColDef<WithId<Member>>[] = [
    { field: 'photoUrl', headerName: '', width: 56, sortable: false, renderCell: (p) => <Avatar src={p.value ?? undefined} sx={{ width: 32, height: 32 }}>{p.row.name[0]}</Avatar> },
    { field: 'memberId', headerName: 'Member ID', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'skssfId', headerName: 'SKSSF ID', width: 120 },
    { field: 'phone', headerName: 'Phone', width: 150, valueFormatter: (v: string) => prettyPhone(v) },
    { field: 'bloodGroup', headerName: 'Blood', width: 80 },
    { field: 'houseName', headerName: 'House', width: 150 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip value={p.value} /> },
    { field: 'authUid', headerName: 'App', width: 80, valueFormatter: (v: string | null) => (v ? 'Linked' : '—') },
  ];

  const exportCsv = () =>
    downloadCsv(
      `members-${today()}.csv`,
      rows.map((m) => ({
        'Member ID': m.memberId,
        'SKSSF ID': m.skssfId,
        Name: m.name,
        Phone: m.phone,
        'Blood group': m.bloodGroup,
        "Father's name": m.fatherName,
        'House name': m.houseName,
        Address: m.address,
        'Date of birth': m.dob,
        Status: label(m.status),
      })),
    );

  return (
    <>
      <PageHeader
        title="Members"
        subtitle={`${data.filter((m) => m.status === 'active').length} active of ${data.length}`}
        actions={
          <>
            <Button startIcon={<Download />} onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
            {isAdmin && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>
                Add member
              </Button>
            )}
          </>
        }
      />
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField label="Search name, ID, phone, house" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            {MEMBER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {label(s)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Blood group" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            {BLOOD_GROUPS.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(p) => navigate(`/members/${p.id}`)}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          localeText={{ noRowsLabel: error ?? 'No members yet' }}
          sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
      <MemberFormDialog open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(`/members/${id}`)} />
    </>
  );
}
