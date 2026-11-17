import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import type { Size, Tone } from './types';
import { useControllableState } from './use-controllable-state';
import { describedBy, Field, useFieldIds } from './field';

export const SWATCH_TONES: readonly Tone[] = [
  'accent',
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
];

const TONE_LABEL: Record<Tone, string> = {
  accent: 'Accent',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  info: 'Info',
  neutral: 'Neutral',
};

export interface SwatchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  tone?: Tone;
  size?: Size;
  selected?: boolean;
  label?: string;
  onClick?: () => void;
}

export function Swatch({
  tone = 'neutral',
  size = 'md',
  selected = false,
  label,
  onClick,
  disabled,
  className,
  type = 'button',
  ...rest
}: SwatchProps) {
  const classNames = cx(
    'mors-swatch',
    `mors-swatch--${tone}`,
    size !== 'md' && `mors-swatch--${size}`,
    selected && 'mors-swatch--selected',
    className,
  );
  const accessibleName = label ?? TONE_LABEL[tone];

  if (!onClick && !rest['aria-label']) {
    return <span className={classNames} aria-hidden="true" />;
  }

  return (
    <button
      type={type}
      aria-label={accessibleName}
      aria-pressed={selected}
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    />
  );
}

export interface SwatchGroupProps {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  tones?: readonly Tone[];
  value?: Tone;
  defaultValue?: Tone;
  onChange?: (next: Tone) => void;
  size?: Size;
  block?: boolean;
  id?: string;
  className?: string;
}

export function SwatchGroup({
  label,
  description,
  error,
  tones = SWATCH_TONES,
  value,
  defaultValue = 'accent',
  onChange,
  size = 'md',
  block = true,
  id,
  className,
}: SwatchGroupProps) {
  const ids = useFieldIds(id);
  const [selected, setSelected] = useControllableState(value, defaultValue, onChange);

  return (
    <Field
      ids={ids}
      label={label}
      description={description}
      error={error}
      size={size}
      block={block}
      className={className}
    >
      <div
        role="radiogroup"
        aria-labelledby={label ? ids.labelId : undefined}
        aria-describedby={describedBy(ids, Boolean(description), Boolean(error))}
        className="mors-swatch-group"
      >
        {tones.map((tone) => (
          <Swatch
            key={tone}
            tone={tone}
            size={size}
            selected={selected === tone}
            onClick={() => setSelected(tone)}
            role="radio"
            aria-checked={selected === tone}
          />
        ))}
      </div>
    </Field>
  );
}
