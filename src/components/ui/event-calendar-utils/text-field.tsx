import {
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';
import { describedBy, Field, useFieldControl, type FieldShellProps } from './field';
import { Icon } from './icon';
import { IconButton } from './button';

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldShellProps {
  startIcon?: ReactNode;
  endAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  description,
  error,
  size = 'md',
  block = true,
  startIcon,
  endAdornment,
  className,
  id,
  required,
  disabled,
  onChange,
  onInvalid,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const { ids, validity } = useFieldControl(id, required, error);
  return (
    <Field
      ids={ids}
      label={label}
      description={description}
      error={validity.error}
      required={required}
      size={size}
      block={block}
    >
      <div className={cx('mors-input-shell', disabled && 'mors-is-disabled', className)}>
        {startIcon && <span className="mors-input-prefix">{startIcon}</span>}
        <input
          id={ids.id}
          aria-describedby={describedBy(ids, Boolean(description), Boolean(validity.error), ariaDescribedBy)}
          aria-invalid={validity.error ? true : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          required={required}
          className="mors-input"
          onChange={(event) => {
            validity.reportValue(event.currentTarget.value);
            onChange?.(event);
          }}
          onInvalid={validity.onInvalid}
          {...rest}
        />
        {endAdornment && <span className="mors-input-suffix">{endAdornment}</span>}
      </div>
    </Field>
  );
}

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldShellProps {
  rows?: number;
  autoResize?: boolean;
}

export function TextArea({
  label,
  description,
  error,
  size = 'md',
  block = true,
  rows = 3,
  className,
  id,
  required,
  disabled,
  onChange,
  onInvalid,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextAreaProps) {
  const { ids, validity } = useFieldControl(id, required, error);
  return (
    <Field
      ids={ids}
      label={label}
      description={description}
      error={validity.error}
      required={required}
      size={size}
      block={block}
    >
      <div className={cx('mors-input-shell', disabled && 'mors-is-disabled', className)}>
        <textarea
          id={ids.id}
          rows={rows}
          aria-describedby={describedBy(ids, Boolean(description), Boolean(validity.error), ariaDescribedBy)}
          aria-invalid={validity.error ? true : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          required={required}
          className="mors-textarea"
          onChange={(event) => {
            validity.reportValue(event.currentTarget.value);
            onChange?.(event);
          }}
          onInvalid={validity.onInvalid}
          {...rest}
        />
      </div>
    </Field>
  );
}
