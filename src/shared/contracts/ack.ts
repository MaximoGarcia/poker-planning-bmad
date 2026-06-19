import type { ErrorCode } from './errors.js'

export interface AckError {
  code: ErrorCode | (string & {})
  message: string
  details?: unknown
}

export interface SuccessAck<TData> {
  ok: true
  data: TData
}

export interface FailureAck {
  ok: false
  error: AckError
}

export type Ack<TData> = SuccessAck<TData> | FailureAck

export type AckCallback<TData> = (ack: Ack<TData>) => void

export function createSuccessAck<TData>(data: TData): SuccessAck<TData> {
  return { ok: true, data }
}

export function createFailureAck(error: AckError): FailureAck {
  return { ok: false, error }
}
