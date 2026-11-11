import type { InternalAxiosRequestConfig } from 'axios'

export type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retriedAfterRefresh?: boolean
  _sessionAuthorization?: boolean
}
