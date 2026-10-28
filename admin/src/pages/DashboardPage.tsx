import { Box, Card, CardActionArea, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BLOOD_GROUPS, SAHAJARI_REQUEST_TYPES } from '../shared';
import type { BloodDonor, Equipment, Member, Patient, RequestDoc } from '../shared';
import { PageHeader } from '../components/ui';
import { useCan } from '../lib/auth';
import { useCollection } from '../lib/data';
import { where } from 'firebase/firestore';

function Stat({ title, value, sub, to }: { title: string; value: number | string; sub?: string; to: string }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardActionArea onClick={() => navigate(to)}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function DashboardPage() {
  const { isAdmin } = useCan();
  const members = useCollection<Member>('members');
  const donors = useCollection<BloodDonor>('bloodDonors');
  const patients = useCollection<Patient>('patients');
  const equipment = useCollection<Equipment>('equipment');
  const requests = useCollection<RequestDoc>(
    'requests',
    isAdmin ? [where('status', '==', 'pending')] : [where('status', '==', 'pending'), where('type', 'in', [...SAHAJARI_REQUEST_TYPES])],
    `dash-${isAdmin}`,
  );

  const activeMembers = members.data.filter((m) => m.status === 'active').length;
  const activeDonors = donors.data.filter((d) => d.active && d.available);
  const openPatients = patients.data.filter((p) => p.status !== 'closed').length;
  const inUse = equipment.data.filter((e) => e.status === 'assigned').length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="SKSSF Amappoyil unit at a glance" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat title="Active members" value={activeMembers} sub={`${members.data.length} total`} to="/members" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat title="Available donors" value={activeDonors.length} sub={`${donors.data.length} on the list`} to="/donors" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat title="Patients being supported" value={openPatients} to="/patients" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat title="Pending requests" value={requests.data.length} to="/requests" />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Available donors by blood group</Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {BLOOD_GROUPS.map((g) => (
                  <Chip key={g} label={`${g} · ${activeDonors.filter((d) => d.bloodGroup === g).length}`} color="secondary" variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Equipment</Typography>
              <Box>
                <Typography variant="body2">{inUse} issued to patients</Typography>
                <Typography variant="body2">{equipment.data.filter((e) => e.status === 'available').length} available</Typography>
                <Typography variant="body2">{equipment.data.filter((e) => e.status === 'maintenance').length} under maintenance</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
