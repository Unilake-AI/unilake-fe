import { http } from '@/api/http'
import type { IngestionJob } from '@/types/ingestion'
import type { UploadIngestionParams } from '@/types/staff-upload'

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

  return form
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
