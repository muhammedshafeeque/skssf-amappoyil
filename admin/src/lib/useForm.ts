import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { errorMessage } from './data';

/**
 * react-hook-form + Zod with a submit wrapper that tracks "saving" and shows errors.
 * `onValid` receives the parsed (transformed) values.
 */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, defaults: DefaultValues<z.input<S> & FieldValues>) {
  const form = useForm<z.input<S> & FieldValues, unknown, z.output<S>>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = (onValid: (values: z.output<S>) => Promise<void>) =>
    form.handleSubmit(async (values) => {
      setError(null);
      setSaving(true);
      try {
        await onValid(values as z.output<S>);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setSaving(false);
      }
    });

  return { ...form, error, setError, saving, submit };
}
