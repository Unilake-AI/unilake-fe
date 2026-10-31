import { KeyRound } from 'lucide-react'

import { Card, MockNotice, PageHeader, Tag } from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'

const LLM_SETTINGS = [
  ['Nhà cung cấp (LLM_PROVIDER)', 'anthropic'],
  ['Mô hình (LLM_MODEL)', 'claude-sonnet-5-5'],
  ['Thời gian chờ (giây)', '30'],
  ['Số lần thử lại khi SQL sai', '2'],
]

const SESSION_SETTINGS = [
  ['Thời hạn access token (phút)', '60'],
  ['Thời hạn refresh token (ngày)', '7'],
]

const PROMPTS = [
  {
    name: 'Sinh SQL từ câu hỏi và schema',
    version: 'v3',
    status: 'ĐANG DÙNG',
    updated: '02/10 14:20',
  },
  { name: 'Xác định ý định câu hỏi', version: 'v2', status: 'ĐANG DÙNG', updated: '28/09 09:05' },
  {
    name: 'Viết câu trả lời từ kết quả',
    version: 'v2',
    status: 'ĐANG DÙNG',
    updated: '25/09 16:40',
  },
  {
    name: 'Sinh SQL từ câu hỏi và schema',
    version: 'v2 · Bản cũ',
    status: 'LƯU TRỮ',
    updated: '20/09 11:12',
  },
]

const SERVICES: { name: string; detail: string; status: string; tone: Tone }[] = [
  {
    name: 'PostgreSQL',
    detail: 'Schema app + gold · cổng 5434',
    status: 'HEALTHY',
    tone: 'emerald',
  },
  { name: 'MinIO', detail: 'Bucket bronze / silver / gold', status: 'HEALTHY', tone: 'emerald' },
  { name: 'DuckDB', detail: 'Nhúng trong backend', status: 'HEALTHY', tone: 'emerald' },
  { name: 'LLM API', detail: 'Độ trễ trung bình 1,2 giây', status: 'DEGRADED', tone: 'amber' },
]

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-800">
        {value}
      </p>
    </div>
  )
}

export function SettingsView() {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị hệ thống', 'Cấu hình hệ thống & AI']}
        title="Cấu hình hệ thống & AI"
        description="Thiết lập mô hình ngôn ngữ dùng cho Hỏi AI, phiên đăng nhập và theo dõi trạng thái các dịch vụ nền."
      />
      <MockNotice api="GET /admin/settings" />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Mô hình AI (LLM)"
          subtitle="Dùng cho Text-to-SQL · chỉ module Hỏi AI gọi tới"
          right={<Tag tone="emerald">ACTIVE</Tag>}
          bodyClassName="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {LLM_SETTINGS.map(([label, value]) => (
              <ReadonlyField key={label} label={label ?? ''} value={value ?? ''} />
            ))}
          </div>
          <div className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <KeyRound className="mt-px size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <p>
              <span className="font-semibold text-slate-800">Khoá API không hiển thị ở đây.</span>{' '}
              LLM_API_KEY chỉ đọc từ biến môi trường của máy chủ, không lưu trong cơ sở dữ liệu và
              không trả về giao diện.
            </p>
          </div>
        </Card>
        <Card
          title="Bảo mật & phiên đăng nhập"
          subtitle="JWT · áp dụng cho mọi người dùng"
          bodyClassName="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {SESSION_SETTINGS.map(([label, value]) => (
              <ReadonlyField key={label} label={label ?? ''} value={value ?? ''} />
            ))}
          </div>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Thay đổi có hiệu lực ở lần đăng nhập kế tiếp. Phiên đang mở vẫn giữ thời hạn cũ cho tới
            khi hết hạn.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card
          title="Prompt template"
          subtitle="Phiên bản prompt dùng cho từng bước của Hỏi AI"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['Tên', 'Phiên bản', 'Trạng thái', 'Cập nhật'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PROMPTS.map((prompt) => (
                  <tr key={`${prompt.name}-${prompt.version}`}>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{prompt.name}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{prompt.version}</td>
                    <td className="px-3 py-2.5">
                      <Tag tone={prompt.status === 'ĐANG DÙNG' ? 'emerald' : 'slate'}>
                        {prompt.status}
                      </Tag>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{prompt.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Trạng thái dịch vụ" subtitle="Kiểm tra định kỳ">
          <ul className="divide-y divide-slate-100">
            {SERVICES.map((service) => (
              <li key={service.name} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{service.name}</p>
                  <p className="text-[11px] text-slate-500">{service.detail}</p>
                </div>
                <Tag tone={service.tone}>{service.status}</Tag>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
