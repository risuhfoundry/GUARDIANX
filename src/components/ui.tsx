import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Info, LoaderCircle, Search, X } from 'lucide-react';

export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('button', `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="button__spinner" aria-hidden="true"><LoaderCircle size={15} /></span>}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button type="button" className={cx('icon-button', className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  errorMessage?: string;
}

export function Input({ label, hint, errorMessage, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className={cx('input', errorMessage && 'input--error', className)}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {errorMessage ? <p className="field__error" id={errorId}>{errorMessage}</p> : hint ? <p className="field__hint" id={hintId}>{hint}</p> : null}
    </div>
  );
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function SearchInput({ label, className, ...props }: SearchInputProps) {
  return (
    <div className={cx('search-field', className)}>
      <Search size={15} aria-hidden="true" />
      <input type="search" aria-label={label} placeholder={label} {...props} />
    </div>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function SelectField({ label, hint, id, className, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="field">
      <label className="field__label" htmlFor={selectId}>{label}</label>
      <div className="select-wrap">
        <select id={selectId} className={cx('select', className)} aria-describedby={hint ? `${selectId}-hint` : undefined} {...props}>
          {children}
        </select>
        <ChevronDown className="select-wrap__icon" size={15} aria-hidden="true" />
      </div>
      {hint && <p className="field__hint" id={`${selectId}-hint`}>{hint}</p>}
    </div>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', className)} {...props}>{children}</div>;
}

export function CardHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card-heading">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusIndicator({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'pending' }) {
  return <span className={cx('status', `status--${tone}`)}><span className="status__dot" aria-hidden="true" /><span>{label}</span></span>;
}

export function Avatar({ name, initials, size = 'md' }: { name: string; initials: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={cx('avatar', `avatar--${size}`)} aria-label={name} title={name}>{initials}</span>;
}

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ items, selected, onChange, label = 'View options' }: { items: TabItem[]; selected: string; onChange: (id: string) => void; label?: string }) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((item) => item.id === selected);
    if (currentIndex === -1) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (currentIndex + 1) % items.length; break;
      case 'ArrowLeft': nextIndex = (currentIndex - 1 + items.length) % items.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = items.length - 1; break;
      default: return;
    }

    event.preventDefault();
    onChange(items[nextIndex].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  return (
    <div className="tabs" ref={listRef} role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
      {items.map((item) => (
        <button
          className={cx('tab', selected === item.id && 'tab--active')}
          key={item.id}
          type="button"
          role="tab"
          aria-selected={selected === item.id}
          tabIndex={selected === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Dropdown({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={cx('dropdown', className)}>
      <summary className="dropdown__trigger">
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="dropdown__panel">{children}</div>
    </details>
  );
}

export function Dialog({ open, onClose, title, description, children, className }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cx('dialog', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={() => { if (open) onClose(); }}
    >
      <div className="dialog__head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <IconButton label="Close dialog" onClick={onClose}><X size={17} /></IconButton>
      </div>
      <div className="dialog__body">{children}</div>
    </dialog>
  );
}

export function Toast({ message, tone = 'info', onDismiss }: { message: string; tone?: 'info' | 'success' | 'error'; onDismiss: () => void }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  return (
    <div className={cx('toast', `toast--${tone}`)} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <Icon size={17} aria-hidden="true" />
      <span>{message}</span>
      <IconButton label="Dismiss notification" onClick={onDismiss}><X size={15} /></IconButton>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination__count">Page <strong>{page}</strong> of {totalPages}</span>
      <div className="pagination__actions">
        <IconButton label="Previous page" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}><ChevronLeft size={16} /></IconButton>
        <IconButton label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}><ChevronRight size={16} /></IconButton>
      </div>
    </nav>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({ title, description, icon: Icon = Info, action }: { title: string; description: string; icon?: typeof Info; action?: ReactNode }) {
  return (
    <div className="state state--empty">
      <span className="state__icon"><Icon size={18} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon"><AlertCircle size={18} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

export function DataTable({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return <div className={cx('table-wrap', className)}><table className="data-table"><caption className="sr-only">{label}</caption>{children}</table></div>;
}
