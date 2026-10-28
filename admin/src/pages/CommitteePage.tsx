import { Avatar, Box, Button, Card, CardActions, CardContent, Grid, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, Delete, Edit, PhotoCamera } from '@mui/icons-material';
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { committeeSchema } from '../shared';
import type { CommitteeMember, Member } from '../shared';
import { CheckEl, SelectEl, TextEl } from '../components/form';
import { FormDialog, PageHeader, useToast } from '../components/ui';
import { useCan } from '../lib/auth';
import { errorMessage, stamp, useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { db } from '../lib/firebase';
import { uploadImage } from '../lib/files';
import { phoneInput, prettyPhone } from '../lib/phone';
import { useZodForm } from '../lib/useForm';

const schema = committeeSchema.extend({ phone: phoneInput });

function CommitteeDialog({ open, onClose, item, nextOrder, members }: { open: boolean; onClose: () => void; item: WithId<CommitteeMember> | null; nextOrder: number; members: WithId<Member>[] }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError, watch, setValue } = useZodForm(schema, {} as never);
  const [photo, setPhoto] = useState<File | null>(null);
  const memberId = watch('memberId');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPhoto(null);
    const year = new Date().getFullYear();
    reset(
      item
        ? ({ ...item, email: item.email ?? '', memberId: item.memberId ?? '' } as never)
        : ({ name: '', designation: '', phone: '', email: '', memberId: '', order: nextOrder, term: `${year}-${String(year + 2).slice(2)}`, isCurrent: true } as never),
    );
  }, [open, item, nextOrder, reset, setError]);

  // Picking a member fills name and phone.
  useEffect(() => {
    const m = members.find((x) => x.id === memberId);
    if (m && !item) {
      setValue('name', m.name);
      setValue('phone', m.phone);
    }
  }, [memberId, members, item, setValue]);

  const onSubmit = submit(async (values) => {
    let id = item?.id;
    if (id) await updateDoc(doc(db, 'committee', id), { ...values, ...stamp() });
    else id = (await addDoc(collection(db, 'committee'), { ...values, photoUrl: null, ...stamp(true) })).id;
    if (photo) {
      const url = await uploadImage(`committee/${id}.jpg`, photo, { max: 512, square: true });
      await updateDoc(doc(db, 'committee', id), { photoUrl: url, ...stamp() });
    }
    toast(item ? 'Saved' : 'Added to committee');
    onClose();
  });

  return (
    <FormDialog open={open} title={item ? `Edit ${item.name}` : 'Add office-bearer'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error}>
      <SelectEl control={control} name="memberId" label="Unit member (optional)" allowEmpty options={members.map((m) => ({ value: m.id, label: `${m.memberId} · ${m.name}` }))} />
      <TextEl control={control} name="name" label="Name" required />
      <TextEl control={control} name="designation" label="Designation" required helperText="e.g. President, Secretary, Treasurer, Sahajari convener" />
      <Stack direction="row" spacing={2}>
        <TextEl control={control} name="phone" label="Phone" required />
        <TextEl control={control} name="email" label="Email (optional)" />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextEl control={control} name="term" label="Term" required helperText="e.g. 2025-27" />
        <TextEl control={control} name="order" label="Display order" number />
      </Stack>
      <CheckEl control={control} name="isCurrent" label="Current committee" />
      <Button component="label" startIcon={<PhotoCamera />} variant="outlined">
        {photo ? photo.name : item?.photoUrl ? 'Replace photo' : 'Add photo'}
        <input hidden type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </Button>
    </FormDialog>
  );
}

export function CommitteePage() {
  const { isAdmin } = useCan();
  const toast = useToast();
  const { data } = useCollection<CommitteeMember>('committee');
  const members = useCollection<Member>('members');
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState<WithId<CommitteeMember> | null | undefined>(undefined);

  const current = useMemo(() => data.filter((c) => c.isCurrent).sort((a, b) => a.order - b.order), [data]);
  const past = useMemo(() => {
    const byTerm = new Map<string, WithId<CommitteeMember>[]>();
    data.filter((c) => !c.isCurrent).forEach((c) => byTerm.set(c.term, [...(byTerm.get(c.term) ?? []), c]));
    return [...byTerm.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([term, list]) => [term, list.sort((a, b) => a.order - b.order)] as const);
  }, [data]);

  const move = async (i: number, dir: -1 | 1) => {
    const a = current[i];
    const b = current[i + dir];
    if (!a || !b) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'committee', a.id), { order: b.order === a.order ? a.order + dir : b.order, ...stamp() });
    batch.update(doc(db, 'committee', b.id), { order: a.order, ...stamp() });
    await batch.commit().catch((err) => toast(errorMessage(err), 'error'));
  };

  const renumber = async () => {
    const batch = writeBatch(db);
    current.forEach((c, i) => batch.update(doc(db, 'committee', c.id), { order: (i + 1) * 10, ...stamp() }));
    await batch.commit();
  };

  const closeTerm = async () => {
    if (!window.confirm('Move the whole current committee to "Past committees"? Do this when a new committee takes over.')) return;
    const batch = writeBatch(db);
    current.forEach((c) => batch.update(doc(db, 'committee', c.id), { isCurrent: false, ...stamp() }));
    await batch.commit();
    toast('Term closed');
  };

  const remove = async (c: WithId<CommitteeMember>) => {
    if (window.confirm(`Remove ${c.name}?`)) await deleteDoc(doc(db, 'committee', c.id)).catch((err) => toast(errorMessage(err), 'error'));
  };

  const cards = (list: readonly WithId<CommitteeMember>[], reorder: boolean) => (
    <Grid container spacing={2}>
      {list.map((c, i) => (
        <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ textAlign: 'center', flex: 1 }}>
              <Avatar src={c.photoUrl ?? undefined} sx={{ width: 88, height: 88, mx: 'auto', mb: 1, fontSize: 32 }}>{c.name[0]}</Avatar>
              <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
              <Typography color="primary">{c.designation}</Typography>
              <Typography variant="body2" color="text.secondary">{prettyPhone(c.phone)}</Typography>
              {c.memberId && <Typography variant="caption" color="text.secondary">{c.memberId}</Typography>}
            </CardContent>
            {isAdmin && (
              <CardActions sx={{ justifyContent: 'center' }}>
                {reorder && (
                  <>
                    <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUpward fontSize="small" /></IconButton>
                    <IconButton size="small" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDownward fontSize="small" /></IconButton>
                  </>
                )}
                <IconButton size="small" onClick={() => setEditing(c)} aria-label="Edit"><Edit fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => remove(c)} aria-label="Remove"><Delete fontSize="small" /></IconButton>
              </CardActions>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <>
      <PageHeader
        title="Committee"
        subtitle={current[0] ? `Term ${current[0].term}` : 'No current committee yet'}
        actions={
          isAdmin && (
            <>
              {current.length > 1 && <Button onClick={renumber}>Tidy order</Button>}
              {current.length > 0 && <Button color="warning" onClick={closeTerm}>Close term</Button>}
              <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)}>Add office-bearer</Button>
            </>
          )
        }
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Current (${current.length})`} />
        <Tab label={`Past committees (${past.length})`} />
      </Tabs>
      {tab === 0 && cards(current, true)}
      {tab === 1 &&
        (past.length === 0 ? (
          <Typography color="text.secondary">No past committees yet.</Typography>
        ) : (
          past.map(([term, list]) => (
            <Box key={term} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Term {term}</Typography>
              {cards(list, false)}
            </Box>
          ))
        ))}
      <CommitteeDialog
        open={editing !== undefined}
        item={editing ?? null}
        onClose={() => setEditing(undefined)}
        nextOrder={(current.at(-1)?.order ?? 0) + 10}
        members={members.data.filter((m) => m.status === 'active')}
      />
    </>
  );
}
