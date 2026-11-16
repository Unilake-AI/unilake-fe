export type UploadDomain = 'hr' | 'academic' | 'admissions'

export type UploadIngestionParams =
  | {
      mode: 'existing'
      file: File
      datasetId: number
      parserOptions?: Record<string, unknown>
      onUploadProgress?: (percent: number) => void
    }
  | {
      mode: 'new'
      file: File
      datasetName: string
      description?: string
      domain?: UploadDomain
      parserOptions?: Record<string, unknown>
      onUploadProgress?: (percent: number) => void
    }
