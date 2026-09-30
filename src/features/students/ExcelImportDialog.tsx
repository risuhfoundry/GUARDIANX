import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { Button, DataTable, Dialog, StatusIndicator } from '../../components/ui';
import { createId, type AdminStudent } from '../../data/adminData';
import { useAdminData } from '../admin/AdminDataContext';

interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  admissionNumber: string;
  className: string;
  classId: string;
  issues: string[];
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return '';
}

export function ExcelImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (count: number) => void }) {
  const { state, dispatch } = useAdminData();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setPreviewRows([]);
    setParseError('');
    setIsParsing(false);
    setHasRead(false);
  }, [open]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    setFile(selected);
    setPreviewRows([]);
    setParseError('');
    setHasRead(false);
    if (!selected) return;

    setIsParsing(true);
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const rows = await readSheet(selected);
      if (!rows.length) throw new Error('The selected workbook does not contain a readable sheet.');

      const headerIndex = new Map<string, number>();
      rows[0].forEach((value, index) => {
        const heading = cellText(value).toLocaleLowerCase();
        if (heading) headerIndex.set(heading, index);
      });
      const requiredColumns = ['student name', 'admission number', 'class'];
      const missingColumns = requiredColumns.filter((heading) => !headerIndex.has(heading));
      if (missingColumns.length) {
        throw new Error(`Missing required column${missingColumns.length > 1 ? 's' : ''}: ${missingColumns.map((column) => column.replace(/^./, (letter) => letter.toUpperCase())).join(', ')}.`);
      }

      const classByName = new Map(state.classes.map((schoolClass) => [schoolClass.name.trim().toLocaleLowerCase(), schoolClass]));
      const seenAdmissions = new Set(state.students.map((student) => student.admissionNumber.trim().toLocaleLowerCase()));
      const nextRows: ImportPreviewRow[] = rows.slice(1).flatMap((row, index) => {
        const name = cellText(row[headerIndex.get('student name')!]);
        const admissionNumber = cellText(row[headerIndex.get('admission number')!]);
        const className = cellText(row[headerIndex.get('class')!]);
        if (!name && !admissionNumber && !className) return [];

        const issues: string[] = [];
        if (!name) issues.push('Student name is required.');
        if (!admissionNumber) issues.push('Admission number is required.');
        if (admissionNumber) {
          const normalized = admissionNumber.toLocaleLowerCase();
          if (seenAdmissions.has(normalized)) issues.push('Admission number already exists or is duplicated.');
          seenAdmissions.add(normalized);
        }
        const matchedClass = classByName.get(className.toLocaleLowerCase());
        if (!className) issues.push('Class is required.');
        else if (!matchedClass) issues.push('Class does not match a listed class.');

        return [{ rowNumber: index + 2, name, admissionNumber, className, classId: matchedClass?.id ?? '', issues }];
      });
      if (nextRows.length === 0) throw new Error('No student rows were found below the header row.');
      setPreviewRows(nextRows);
      setHasRead(true);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'This workbook could not be read. Select a valid .xlsx file.');
      setHasRead(true);
    } finally {
      setIsParsing(false);
    }
  }

  const invalidCount = previewRows.filter((row) => row.issues.length > 0).length;
  const readyToImport = hasRead && !isParsing && Boolean(file) && !parseError && previewRows.length > 0 && invalidCount === 0;
  const fileSize = file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '';

  function confirmImport() {
    if (!readyToImport) return;
    const items: AdminStudent[] = previewRows.map((row) => ({
      id: createId('student'),
      name: row.name,
      admissionNumber: row.admissionNumber,
      classId: row.classId,
      guardianIds: [],
    }));
    dispatch({ type: 'import-students', items });
    onImported(items.length);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import students from Excel" description="The workbook is read locally. Files are not uploaded and records are not saved to a backend." className="dialog--wide">
      <div className="import-flow">
        <div className="import-step"><span>1</span><div><strong>Choose Excel file</strong><small>Upload a .xlsx workbook</small></div></div>
        <label className="upload-zone" htmlFor={inputId}>
          <span className="upload-zone__icon" aria-hidden="true">XLSX</span>
          <span><strong>{file ? 'Choose a different file' : 'Select an Excel file'}</strong><small>Only Student Name, Admission Number, and Class columns are imported. Other columns are ignored.</small></span>
        </label>
        <input id={inputId} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} />

        {file && <div className="selected-file"><div><strong>{file.name}</strong><small>{fileSize} · stays in this browser</small></div><StatusIndicator label={isParsing ? 'Reading' : parseError ? 'Check file' : 'Selected'} tone={isParsing ? 'pending' : parseError ? 'warning' : 'success'} /></div>}
        {parseError && <p className="form-error import-error" role="alert">{parseError}</p>}

        <div className="import-step"><span>2</span><div><strong>Preview & validate rows</strong><small>Every row must have a unique admission number and a listed class.</small></div></div>
        {isParsing && <p className="muted-copy" role="status">Reading workbook in this browser…</p>}
        {!file && <div className="import-empty">The selected file and student rows will appear here.</div>}
        {previewRows.length > 0 && (
          <>
            <div className="validation-summary" role="status">
              <StatusIndicator label={invalidCount === 0 ? `${previewRows.length} rows ready` : `${invalidCount} rows need attention`} tone={invalidCount === 0 ? 'success' : 'warning'} />
              <span>{invalidCount === 0 ? 'Validation passed' : 'Correct the file and select it again to import.'}</span>
            </div>
            <DataTable label="Excel student import preview">
              <thead><tr><th scope="col">Student name</th><th scope="col">Admission number</th><th scope="col">Class</th><th scope="col">Validation</th></tr></thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.admissionNumber}`}>
                    <td>{row.name || '—'}</td>
                    <td>{row.admissionNumber || '—'}</td>
                    <td>{row.className || '—'}</td>
                    <td>{row.issues.length ? <span className="validation-errors" title={row.issues.join(' ')}>{row.issues.join(' ')}</span> : <StatusIndicator label="Valid" tone="success" />}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </>
        )}

        <div className="import-step"><span>3</span><div><strong>Confirm import</strong><small>Confirmation adds valid rows to this local session only.</small></div></div>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!readyToImport} onClick={confirmImport}>Confirm import</Button>
        </div>
      </div>
    </Dialog>
  );
}
