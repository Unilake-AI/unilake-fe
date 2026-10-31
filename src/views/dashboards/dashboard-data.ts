/**
 * Số liệu mẫu cho các dashboard, lấy đúng theo bản thiết kế Figma.
 * Backend chưa có API `/dashboard/*`; khi có sẽ thay bằng dữ liệu thật.
 */

export const ADMISSIONS = {
  kpis: [
    {
      label: 'Hồ sơ đăng ký',
      value: '4.520',
      hint: '+10% so với năm trước',
      tone: 'emerald' as const,
    },
    { label: 'Trúng tuyển', value: '2.180', hint: 'Tỷ lệ trúng tuyển: 48,2%' },
    { label: 'Nhập học', value: '1.750', hint: 'Đạt chỉ tiêu: 87,5%', tone: 'indigo' as const },
    { label: 'Tỷ lệ trúng tuyển', value: '48,2%', hint: 'Trúng tuyển / Hồ sơ' },
    {
      label: 'Tỷ lệ nhập học',
      value: '80,3%',
      hint: '+1,8 điểm % so với 2025',
      tone: 'emerald' as const,
    },
  ],
  trend: [
    { year: '2022', register: 3520, admitted: 1720, enrolled: 1340 },
    { year: '2023', register: 3810, admitted: 1850, enrolled: 1450 },
    { year: '2024', register: 3950, admitted: 1930, enrolled: 1520 },
    { year: '2025', register: 4110, admitted: 2010, enrolled: 1610 },
    { year: '2026', register: 4520, admitted: 2180, enrolled: 1750 },
  ],
  funnel: [
    { label: 'Hồ sơ đăng ký', value: '4.520 (100%)', percent: 100 },
    { label: 'Trúng tuyển', value: '2.180 (48,2%)', percent: 48.2 },
    { label: 'Xác nhận nhập học', value: '1.750 (38,7%)', percent: 38.7 },
  ],
  majors: [
    { label: 'Khoa học Máy tính [7480101]', value: '362 / 350 · 103,4%', percent: 103.4 },
    { label: 'Trí tuệ Nhân tạo [7480107]', value: '231 / 220 · 105,0%', percent: 105 },
    { label: 'Kỹ thuật Phần mềm [7480103]', value: '295 / 300 · 98,3%', percent: 98.3 },
    { label: 'Quản trị Kinh doanh [7340101]', value: '265 / 280 · 94,6%', percent: 94.6 },
  ],
  methods: [
    { label: 'Điểm thi THPT', value: '790 · 80,6%', percent: 80.6 },
    { label: 'Đánh giá năng lực', value: '515 · 83,1%', percent: 83.1 },
    { label: 'Tuyển thẳng & ưu tiên', value: '220 · 91,7%', percent: 91.7 },
    { label: 'Xét học bạ THPT', value: '125 · 65,8%', percent: 65.8 },
  ],
}

export const ACADEMIC = {
  kpis: [
    {
      label: 'Sinh viên đang học',
      value: '18.450',
      hint: '+5,2% so với năm trước',
      tone: 'emerald' as const,
    },
    { label: 'GPA trung bình', value: '3,24', hint: 'Thang điểm 4,0' },
    { label: 'Lớp học phần đang mở', value: '1.286', hint: '412 học phần' },
    { label: 'Tỷ lệ qua môn', value: '91,7%', hint: '8,3% cần học lại', tone: 'amber' as const },
  ],
  gpaTrend: [
    { term: 'HK1 24-25', gpa: 3.12 },
    { term: 'HK2 24-25', gpa: 3.16 },
    { term: 'HK hè', gpa: 3.05 },
    { term: 'HK1 25-26', gpa: 3.21 },
    { term: 'HK2 25-26', gpa: 3.24 },
  ],
  majors: [
    { label: 'Khoa học Dữ liệu', value: '3,41', percent: 85.3 },
    { label: 'Trí tuệ Nhân tạo', value: '3,38', percent: 84.5 },
    { label: 'Kỹ thuật Phần mềm', value: '3,29', percent: 82.3 },
    { label: 'Quản trị Kinh doanh', value: '3,18', percent: 79.5 },
    { label: 'Logistics', value: '3,07', percent: 76.8 },
  ],
}

export const HR = {
  kpis: [
    { label: 'Tổng nhân sự', value: '1.312', hint: '842 giảng viên · 470 chuyên viên' },
    { label: 'Giảng viên cơ hữu', value: '842', hint: '64,2% tổng nhân sự' },
    {
      label: 'Có học vị Tiến sĩ trở lên',
      value: '62,5%',
      hint: '526 giảng viên',
      tone: 'indigo' as const,
    },
    { label: 'Tỷ lệ SV / GV', value: '21,9', hint: 'Chuẩn Bộ: ≤ 25,0', tone: 'emerald' as const },
  ],
  degrees: [
    { label: 'Giáo sư / Phó Giáo sư', value: '94 · 11,2%', percent: 11.2 },
    { label: 'Tiến sĩ', value: '432 · 51,3%', percent: 51.3 },
    { label: 'Thạc sĩ', value: '298 · 35,4%', percent: 35.4 },
    { label: 'Cử nhân', value: '18 · 2,1%', percent: 2.1 },
  ],
  units: [
    { label: 'Khoa Kinh tế & Quản trị', value: '236', percent: 100 },
    { label: 'Khoa Kỹ thuật & Công nghệ', value: '214', percent: 90.7 },
    { label: 'Khoa Khoa học Máy tính & AI', value: '148', percent: 62.7 },
    { label: 'Khoa Khoa học Xã hội', value: '132', percent: 55.9 },
  ],
}

export const MAJOR_COMPARISON = [
  { major: 'Khoa học Máy tính', group: 'Công nghệ thông tin', previous: 329, current: 362 },
  { major: 'Kỹ thuật Phần mềm', group: 'Công nghệ thông tin', previous: 268, current: 295 },
  { major: 'Quản trị Kinh doanh', group: 'Kinh tế', previous: 271, current: 265 },
  { major: 'Trí tuệ Nhân tạo', group: 'Công nghệ thông tin', previous: 210, current: 231 },
  { major: 'Kinh doanh Quốc tế', group: 'Kinh tế', previous: 186, current: 194 },
  { major: 'Khoa học Dữ liệu', group: 'Toán – Tin học', previous: 167, current: 184 },
]

/** Tăng trưởng phần trăm, làm tròn 1 chữ số; null nếu kỳ trước bằng 0. */
export function growthPercent(previous: number, current: number): number | null {
  if (previous === 0) {
    return null
  }
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function formatGrowth(value: number | null): string {
  if (value == null) {
    return '—'
  }
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('vi-VN', { minimumFractionDigits: 1 })}%`
}
