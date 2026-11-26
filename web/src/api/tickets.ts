import { apiFetch, getToken } from './client'
import { env } from '../config/env'
import type { TicketCategory, TicketPriority, TicketStatus, TriageStatus } from '../types/ticket'

type Ticket = {
  id: string
  title: string
  description: string
  status: TicketStatus
  category: TicketCategory | null
  priority: TicketPriority | null
  triageStatus: TriageStatus
  customerId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

type Reply = {
  id: string
  ticketId: string
  authorId: string
  body: string
  createdAt: string
  author: { id: string; name: string; role: string }
}

export type Attachment = {
  id: string
  ticketId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type TicketDetail = Ticket & { replies: Reply[]; attachments: Attachment[] }

export type TicketPage = {
  items: Ticket[]
  page: number
  pageSize: number
  total: number
}

export function listTickets(status: string, page: number) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('page', String(page))
  return apiFetch<TicketPage>(`/tickets?${params}`)
}

export function getTicket(id: string) {
  return apiFetch<TicketDetail>(`/tickets/${id}`)
}

export function createTicket(title: string, description: string) {
  return apiFetch<Ticket>('/tickets', { method: 'POST', body: JSON.stringify({ title, description }) })
}

export function assignTicket(id: string) {
  return apiFetch<Ticket>(`/tickets/${id}/assign`, { method: 'POST' })
}

export function resolveTicket(id: string) {
  return apiFetch<Ticket>(`/tickets/${id}/resolve`, { method: 'POST' })
}

export function addReply(id: string, body: string) {
  return apiFetch<Reply>(`/tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ body }) })
}

export function suggestReply(id: string) {
  return apiFetch<{ suggestion: string }>(`/tickets/${id}/suggest-reply`, { method: 'POST' })
}

export async function uploadAttachment(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${env.apiUrl}/api/tickets/${id}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Falha no upload')
  return data as Attachment
}

export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  const res = await fetch(`${env.apiUrl}/api/attachments/${attachmentId}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Não foi possível baixar o anexo')
  return res.blob()
}
