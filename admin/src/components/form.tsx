import { Checkbox, Chip, FormControlLabel, MenuItem, TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { label } from '../lib/labels';

interface Base<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/** Text input bound to react-hook-form; `number` converts to a number (empty → null). */
export function TextEl<T extends FieldValues>({
  control,
  name,
  label: text,
  number,
  ...rest
}: Base<T> & { number?: boolean } & Omit<TextFieldProps, 'name' | 'label'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          label={text}
          name={field.name}
          inputRef={field.ref}
          value={field.value ?? ''}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(number ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
          type={number ? 'number' : rest.type}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
          fullWidth
          slotProps={rest.type === 'date' ? { inputLabel: { shrink: true } } : rest.slotProps}
        />
      )}
    />
  );
}

export function SelectEl<T extends FieldValues>({
  control,
  name,
  label: text,
  options,
  allowEmpty,
  disabled,
}: Base<T> & { options: readonly string[] | { value: string; label: string }[]; allowEmpty?: boolean; disabled?: boolean }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: label(o) } : o));
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          disabled={disabled}
          label={text}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        >
          {allowEmpty && (
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
          )}
          {opts.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

export function MultiSelectEl<T extends FieldValues>({ control, name, label: text, options }: Base<T> & { options: readonly string[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          label={text}
          value={(field.value as string[] | undefined) ?? []}
          onChange={(e) => field.onChange(e.target.value)}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (v) => (
                <>
                  {(v as string[]).map((x) => (
                    <Chip key={x} size="small" label={label(x)} sx={{ mr: 0.5 }} />
                  ))}
                </>
              ),
            },
          }}
        >
          {options.map((o) => (
            <MenuItem key={o} value={o}>
              {label(o)}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

export function CheckEl<T extends FieldValues>({ control, name, label: text }: Base<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label={text} />
      )}
    />
  );
}
