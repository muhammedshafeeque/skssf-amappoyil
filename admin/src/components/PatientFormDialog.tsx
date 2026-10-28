import { Grid } from '@mui/material';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { GENDERS, PATIENT_CATEGORIES, PATIENT_STATUSES, SUPPORT_TYPES, patientSchema } from '../shared';
import type { Patient } from '../shared';
import { stamp } from '../lib/data';
import type { WithId } from '../lib/data';
import { db } from '../lib/firebase';
import { phoneInput } from '../lib/phone';
import { useZodForm } from '../lib/useForm';
import { MultiSelectEl, SelectEl, TextEl } from './form';
import { FormDialog, useToast } from './ui';

const schema = patientSchema.extend({ phone: phoneInput });

export function PatientFormDialog({ open, onClose, patient, onSaved }: { open: boolean; onClose: () => void; patient?: WithId<Patient> | null; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError } = useZodForm(schema, {} as never);

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      patient
        ? ({ ...patient, notes: patient.notes ?? '' } as never)
        : ({ name: '', age: null, gender: 'male', phone: '', address: '', condition: '', need: '', category: '', supportTypes: [], status: 'approved', notes: '' } as never),
    );
  }, [open, patient, reset, setError]);

  const onSubmit = submit(async (values) => {
    if (patient) {
      await updateDoc(doc(db, 'patients', patient.id), { ...values, ...stamp() });
      toast('Patient updated');
      onSaved?.(patient.id);
    } else {
      const ref = await addDoc(collection(db, 'patients'), { ...values, source: 'admin', requestId: null, totals: { received: 0, given: 0 }, ...stamp(true) });
      toast('Patient registered');
      onSaved?.(ref.id);
    }
    onClose();
  });

  return (
    <FormDialog open={open} title={patient ? `Edit ${patient.name}` : 'Register patient'} onClose={onClose} onSubmit={onSubmit} submitting={saving} error={error} maxWidth="md">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="name" label="Name" required /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><TextEl control={control} name="age" label="Age" number required /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><SelectEl control={control} name="gender" label="Gender" options={GENDERS} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextEl control={control} name="phone" label="Contact phone" required /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><SelectEl control={control} name="category" label="Aid category" options={PATIENT_CATEGORIES} /></Grid>
        <Grid size={12}><TextEl control={control} name="address" label="Address" required multiline minRows={2} /></Grid>
        <Grid size={12}><TextEl control={control} name="condition" label="Condition (private)" required multiline minRows={2} helperText="Only staff see this" /></Grid>
        <Grid size={12}><TextEl control={control} name="need" label="Support needed" required helperText="Members see the name, this line and the status" /></Grid>
        <Grid size={{ xs: 12, sm: 8 }}><MultiSelectEl control={control} name="supportTypes" label="Support type" options={SUPPORT_TYPES} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><SelectEl control={control} name="status" label="Status" options={PATIENT_STATUSES} /></Grid>
        <Grid size={12}><TextEl control={control} name="notes" label="Notes (private)" multiline minRows={2} /></Grid>
      </Grid>
    </FormDialog>
  );
}
