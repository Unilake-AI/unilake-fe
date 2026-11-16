import { issueDescription, issueLabels, issueLevel, reportText } from '@/lib/cleaning-report'
import type { CleaningIssue, IssueLevel } from '@/lib/cleaning-report'

export function CleaningIssues({ issues }: { issues: CleaningIssue[] }) {
  const levels: IssueLevel[] = ['error', 'warning', 'information']
  const counts: Record<IssueLevel, number> = { error: 0, warning: 0, information: 0 }
  for (const issue of issues) counts[issueLevel(issue)] += 1
  return (
    <div className="space-y-3 text-xs">
      <p className="text-slate-600">
        Lỗi cần kiểm tra: {counts.error} · Cảnh báo: {counts.warning} · Ghi nhận xử lý hợp lệ:{' '}
        {counts.information}
      </p>
      {counts.information > 0 && (
        <p className="text-slate-600">
          Ghi nhận xử lý hợp lệ, như giữ ô trống được phép, không phải lỗi chặn lưu Silver. Số ghi
          nhận không phải số dòng lỗi.
        </p>
      )}
      {levels.map((level) => {
        const selected = issues.filter((issue) => issueLevel(issue) === level)
        if (selected.length === 0) return null
        const groups = new Map<string, { issue: CleaningIssue; count: number }>()
        for (const issue of selected) {
          const key = JSON.stringify([issue.code, issue.field, issue.key_fields, issue.rule_id])
          const current = groups.get(key)
          if (current) current.count += 1
          else groups.set(key, { issue, count: 1 })
        }
        return (
          <details
            key={level}
            open={level !== 'information'}
            className="rounded-md border border-slate-200 p-3"
          >
            <summary className="cursor-pointer font-semibold">
              {issueLabels[level]} ({selected.length})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th scope="col" className="p-2">
                      Cột
                    </th>
                    <th scope="col" className="p-2">
                      Nội dung
                    </th>
                    <th scope="col" className="p-2">
                      Số ghi nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...groups.entries()].map(([key, { issue, count }]) => (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="p-2">
                        {reportText(
                          issue.field ??
                            (Array.isArray(issue.key_fields) ? issue.key_fields.join(', ') : '—')
                        )}
                      </td>
                      <td className="p-2">
                        {issueDescription(issue)}
                        <span className="ml-2 text-slate-400">
                          ({reportText(issue.code ?? '—')})
                        </span>
                      </td>
                      <td className="p-2">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )
      })}
    </div>
  )
}
