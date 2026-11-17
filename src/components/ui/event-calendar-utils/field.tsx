import { useId, useState, type FormEvent, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import type { Size } from './types';
import { Icon } from './icon';

export interface FieldIds {
  id: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
}

export interface FieldShellProps {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  size?: Size;
  block?: boolean;
}

export function useFieldIds(explicitId?: string): FieldIds {
  const auto = useId();
  const id = explicitId ?? `mors${auto}`;
  return {
    id,
    labelId: `${id}-label`,
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
  };
}

export function describedBy(
  ids: FieldIds,
  hasDescription: boolean,
  hasError: boolean,
  extra?: string,
): string | undefined {
  return [hasDescription && ids.descriptionId, hasError && ids.errorId, extra].filter(Boolean).join(' ') || undefined;
}

export const REQUIRED_ERROR = 'This field is required.';

export function useRequiredValidity(required: boolean | undefined, error: ReactNode | undefined) {
  const [missing, setMissing] = useState(false);
  const shown = error ?? (required && missing ? REQUIRED_ERROR : undefined);

  const onInvalid = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (required && !event.currentTarget.value) {
      setMissing(true);
      event.preventDefault();
    }
  };

  const reportValue = (value: unknown) => {
    if (missing && value) setMissing(false);
  };

  return { error: shown, onInvalid, reportValue };
}

export function useFieldControl(id: string | undefined, required: boolean | undefined, error: ReactNode | undefined) {
  const ids = useFieldIds(id);
  const validity = useRequiredValidity(required, error);
  return { ids, validity };
}

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  ids: FieldIds;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  size?: Size;
  block?: boolean;
}

export function Field({
  ids,
  label,
  description,
  error,
  required,
  size = 'md',
  block = true,
  className,
  children,
  ...rest
}: FieldProps) {
  return (
    <div
      className={cx(
        'mors-field',
        `mors-field--${size}`,
        block && 'mors-field--block',
        error && 'mors-has-error',
        className,
      )}
      {...rest}
    >
      {label && (
        <label id={ids.labelId} htmlFor={ids.id} className="mors-field-label">
          <span>{label}</span>
          {required && (
            <span className="mors-field-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {description && !error && (
        <p id={ids.descriptionId} className="mors-field-description">
          {description}
        </p>
      )}
      {error && (
        <p id={ids.errorId} className="mors-field-error" role="alert">
          <Icon name="warning" size="1.1em" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
