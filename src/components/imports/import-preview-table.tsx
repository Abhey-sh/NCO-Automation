import type { CsvColumn } from '../../lib/csv'

interface ImportPreviewTableProps<T> {
  rows: T[]
  columns: CsvColumn<T>[]
  limit?: number
}

export function ImportPreviewTable<T>({ rows, columns, limit = 50 }: ImportPreviewTableProps<T>) {
  const previewRows = rows.slice(0, limit)

  return (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/70">
            {previewRows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200"
                  >
                    {String(row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
