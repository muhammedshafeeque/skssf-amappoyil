import { Grid } from '@mui/material';
import { useEffect } from 'react';
import { BLOOD_GROUPS, memberFields } from '../shared';
import type { Member } from '../shared';
import { callFn } from '../lib/data';
import { phoneInput } from '../lib/phone';
import { useZodForm } from '../lib/useForm';
import { SelectEl, TextEl } from './form';
import { FormDialog, useToast } from './ui';

const schema = memberFields.extend({ phone: phoneInput });

const empty = { skssfId: '', name: '', phone: '', bloodGroup: '', fatherName: '', houseName: '', address: '', dob: '' };

export function MemberFormDialog({ open, onClose, member, onSaved }: { open: boolean; onClose: () => void; member?: Member | null; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError } = useZodForm(schema, empty as never);

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      member
        ? { skssfId: member.skssfId ?? '', name: member.name, phone: member.phone, bloodGroup: member.bloodGroup, fatherName: member.fatherName, houseName: member.houseName, address: member.address, dob: member.dob }
        : (empty as never),
    );
  }, [open, member, reset, setError]);

  const onSubmit = submit(async (values) => {
    if (member) {
      const res = await callFn<{ loginReset: boolean }>('updateMember', { memberId: member.memberId, changes: values });
      toast(res.loginReset ? 'Saved. Phone changed — the member must log in again.' : 'Member updated');
      onSaved?.(member.memberId);
    } else {
      const res = await callFn<{ memberId: string }>('createMember', values);
      toast(`Member ${res.memberId} created`);
      onSaved?.(res.memberId);
    }
    onClose();
  });

  return (
    <FormDialog open={open} title={member ? `Edit ${member.memberId}` : 'Add member'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} submitLabel={member ? 'Save' : 'Create member'} maxWidth="md">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextEl control={control} name="name" label="Name" required autoFocus />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextEl control={control} name="skssfId" label="SKSSF Member ID (optional)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextEl
            control={control}
            name="phone"
            label="Phone"
            required
            helperText={member ? 'Changing the number signs the member out of the app' : '10-digit number, or +country code'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SelectEl control={control} name="bloodGroup" label="Blood group" options={BLOOD_GROUPS} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextEl control={control} name="dob" label="Date of birth" type="date" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextEl control={control} name="fatherName" label="Father's name" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextEl control={control} name="houseName" label="House name" required />
        </Grid>
        <Grid size={12}>
          <TextEl control={control} name="address" label="Address" required multiline minRows={2} />
        </Grid>
      </Grid>
    </FormDialog>
  );
}
