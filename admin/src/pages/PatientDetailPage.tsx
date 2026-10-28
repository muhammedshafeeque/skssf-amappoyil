import { Alert, Box, Button, Chip, Grid, List, ListItem, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { doc, orderBy, updateDoc, where } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PATIENT_STATUSES } from '../shared';
import type { Assignment, Donation, Patient, PatientStatus } from '../shared';
import { PatientFormDialog } from '../components/PatientFormDialog';
import { Field, PageHeader, StatusChip, useToast } from '../components/ui';
import { errorMessage, stamp, useCollection, useDocument } from '../lib/data';
import { db } from '../lib/firebase';
import { formatTs, label, rupees } from '../lib/labels';
import { prettyPhone } from '../lib/phone';

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: p, loading } = useDocument<Patient>(`patients/${id}`);
  const donations = useCollection<Donation>('donations', [where('patientId', '==', id), orderBy('date', 'desc')], id);
  const history = useCollection<Assignment>('group:assignments', [where('patientId', '==', id)], id);
  const [editing, setEditing] = useState(false);

  if (loading) return null;
  if (!p) return <Alert severity="warning">Patient not found.</Alert>;

  const setStatus = async (status: PatientStatus) => {
    try {
      await updateDoc(doc(db, 'patients', id!), { status, ...stamp() });
      toast(`Status: ${label(status)}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/patients')} sx={{ mb: 1 }}>Patients</Button>
      <PageHeader
        title={p.name}
        subtitle={`${label(p.category)} · ${p.age} yrs · ${label(p.gender)}`}
        actions={
          <>
            <TextField select size="small" label="Status" value={p.status} onChange={(e) => setStatus(e.target.value as PatientStatus)} sx={{ minWidth: 140 }}>
              {PATIENT_STATUSES.map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
            </TextField>
            <Button variant="contained" startIcon={<Edit />} onClick={() => setEditing(true)}>Edit</Button>
          </>
        }
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <StatusChip value={p.status} />
              {p.supportTypes.map((s) => <Chip key={s} size="small" variant="outlined" label={label(s)} />)}
              {p.source === 'request' && <Chip size="small" color="info" variant="outlined" label="From member request" />}
            </Stack>
            <Grid container spacing={2}>
              <Grid size={6}><Field name="Phone" value={prettyPhone(p.phone)} /></Grid>
              <Grid size={6}><Field name="Registered" value={formatTs(p.createdAt)} /></Grid>
              <Grid size={12}><Field name="Address" value={p.address} /></Grid>
              <Grid size={12}><Field name="Condition" value={p.condition} /></Grid>
              <Grid size={12}><Field name="Support needed (visible to members)" value={p.need} /></Grid>
              <Grid size={12}><Field name="Notes" value={p.notes} /></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>Money</Typography>
            <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
              <Box><Typography variant="caption" color="text.secondary">Received for patient</Typography><Typography variant="h6">{rupees(p.totals?.received ?? 0)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Given to patient</Typography><Typography variant="h6">{rupees(p.totals?.given ?? 0)}</Typography></Box>
            </Stack>
            <List dense>
              {donations.data.map((d) => (
                <ListItem key={d.id} disableGutters>
                  <ListItemText
                    primary={`${d.direction === 'in' ? '↓ Received' : '↑ Given'} ${d.amount ? rupees(d.amount) : d.item}`}
                    secondary={`${d.date} · ${label(d.mode)} · ${d.direction === 'in' ? (d.anonymous ? 'Anonymous' : d.donorName) : d.purpose}`}
                  />
                </ListItem>
              ))}
              {donations.data.length === 0 && <Typography variant="body2" color="text.secondary">No donations linked yet.</Typography>}
            </List>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 600 }}>Equipment history</Typography>
            <List dense>
              {history.data.map((a) => (
                <ListItem key={a.id} disableGutters>
                  <ListItemText primary={`${a.issuedAt} → ${a.returnedAt ?? 'still with patient'}`} secondary={`Issued to ${a.issuedTo}${a.returnCondition ? ` · returned ${label(a.returnCondition)}` : ''}`} />
                </ListItem>
              ))}
              {history.data.length === 0 && <Typography variant="body2" color="text.secondary">No equipment issued.</Typography>}
            </List>
          </Paper>
        </Grid>
      </Grid>
      <PatientFormDialog open={editing} onClose={() => setEditing(false)} patient={p} />
    </>
  );
}
