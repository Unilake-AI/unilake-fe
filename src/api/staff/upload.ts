import { isAxiosError } from 'axios'

import { http } from '@/api/http'
import type { IngestionJob } from '@/types/ingestion'
import type {
  StaffImportLayout,
  StaffImportOptions,
  StaffImportReport,
  StaffImportType,
  UploadDomain,
  UploadFileLayout,
  UploadIngestionParams,
} from '@/types/staff-upload'

export function buildIngestionUploadFormData(params: UploadIngestionParams): FormData {
  const form = new FormData()
  form.append('file', params.file)

  if (params.mode === 'existing') {
    form.append('dataset_id', String(params.datasetId))
  } else {
    form.append('dataset_name', params.datasetName.trim())
    const trimmedDescription = params.description?.trim()
    if (trimmedDescription) {
      form.append('description', trimmedDescription)
    }
    if (params.domain) {
      form.append('domain', params.domain)
    }
  }

  if (params.parserOptions && Object.keys(params.parserOptions).length > 0) {
    form.append('parser_options', JSON.stringify(params.parserOptions))
  }
  if (params.importOptions) {
    form.append('import_options', JSON.stringify(params.importOptions))
  }

  return form
}

export async function API_ListStaffImportTypes(): Promise<StaffImportType[]> {
  return (await http.get<StaffImportType[]>('/ingestion/import-types')).data
}

export async function API_ReadUploadFileLayout(
  file: File,
  domain: UploadDomain,
  parserOptions?: Record<string, unknown>
): Promise<UploadFileLayout> {
  const form = new FormData()
  form.append('file', file)
  form.append('domain', domain)
  if (parserOptions) form.append('parser_options', JSON.stringify(parserOptions))
  return (await http.post<UploadFileLayout>('/ingestion/imports/file-layout', form)).data
}

export async function API_AnalyzeStaffImport(
  domain: UploadDomain,
  columns: string[],
  options: StaffImportOptions
): Promise<StaffImportLayout> {
  try {
    return (
      await http.post<StaffImportLayout>('/ingestion/imports/analyze', { domain, columns, options })
    ).data
  } catch (error) {
    if (isAxiosError<{ error?: { details?: Omit<StaffImportLayout, 'status'> } }>(error)) {
      const details = error.response?.data?.error?.details
      if (
        error.response?.status === 422 &&
        details?.field_mapping &&
        Array.isArray(details.issues)
      ) {
        return { ...details, status: 'NEEDS_MAPPING' }
      }
    }
    throw error
  }
}

export async function API_GetStaffImportReport(jobId: number): Promise<StaffImportReport> {
  return (await http.get<StaffImportReport>(`/ingestion/jobs/${jobId}/business-import`)).data
}

export async function API_DownloadAdmissionsUpdate(
  datasetId: number,
  workflow: 'results' | 'enrollment',
  offset: number
): Promise<{ blob: Blob; nextOffset: number | null }> {
  const response = await http.get<Blob>('/admissions/registrations/export', {
    params: { dataset_id: datasetId, workflow, offset },
    responseType: 'blob',
  })
  const next = Number(response.headers['x-next-offset'])
  return {
    blob: response.data,
    nextOffset: Number.isSafeInteger(next) && next > offset ? next : null,
  }
}

export async function API_UploadIngestion(params: UploadIngestionParams): Promise<IngestionJob> {
  const form = buildIngestionUploadFormData(params)
  const res = await http.post<IngestionJob>('/ingestion/uploads', form, {
    onUploadProgress: (event) => {
      if (!params.onUploadProgress || !event.total) return
      const percent = Math.min(100, Math.round((event.loaded * 100) / event.total))
      params.onUploadProgress(percent)
    },
  })
  return res.data
}

export async function API_UploadIngestionFile(
  file: File,
  datasetId: number,
  parserOptions?: Record<string, unknown>
): Promise<IngestionJob> {
  return API_UploadIngestion({
    mode: 'existing',
    file,
    datasetId,
    parserOptions,
  })
}

export async function API_UploadQualityIssueFile(
  issueId: string,
  file: File,
  parserOptions?: Record<string, unknown>,
  onUploadProgress?: (percent: number) => void
): Promise<IngestionJob> {
  const form = new FormData()
  form.append('file', file)
  if (parserOptions && Object.keys(parserOptions).length > 0) {
    form.append('parser_options', JSON.stringify(parserOptions))
  }

  const res = await http.post<IngestionJob>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/uploads`,
    form,
    {
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return
        const percent = Math.min(100, Math.round((event.loaded * 100) / event.total))
        onUploadProgress(percent)
      },
    }
  )
  return res.data
}
