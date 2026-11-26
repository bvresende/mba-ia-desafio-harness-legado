import { describe, expect, it } from 'vitest'
import { AuthUser, UploadedFile } from '../domain/auth'
import { AppError } from '../domain/errors'
import { Attachment } from '../domain/ticket'
import { AttachmentRepository } from '../repositories/attachment-repository'
import { AttachmentService } from './attachment-service'
import { TicketService } from './ticket-service'

function fakeTicketService(ticket: { id: string; customerId: string }) {
  return {
    getById: async (user: AuthUser, id: string) => {
      if (id !== ticket.id || (user.role === 'customer' && user.id !== ticket.customerId)) {
        throw new AppError(404, 'not_found', 'Chamado não encontrado')
      }
      return ticket
    },
  } as unknown as TicketService
}

const fakeAttachments: AttachmentRepository = {
  create: async (data): Promise<Attachment> => ({ id: 'att1', createdAt: new Date(), ...data }),
  findById: async () => null,
}

const ticket = { id: 't1', customerId: 'c1' }
const customer: AuthUser = { id: 'c1', role: 'customer' }
const otherCustomer: AuthUser = { id: 'c2', role: 'customer' }

describe('AttachmentService', () => {
  const service = new AttachmentService(fakeAttachments, fakeTicketService(ticket))

  it('exige arquivo', async () => {
    await expect(service.upload('t1', customer, undefined)).rejects.toMatchObject({ status: 422 })
  })

  it('recusa arquivo maior que 5 MB', async () => {
    const file: UploadedFile = {
      size: 5 * 1024 * 1024 + 1,
      mimetype: 'text/plain',
      originalname: 'a.txt',
      buffer: Buffer.from(''),
    }
    await expect(service.upload('t1', customer, file)).rejects.toMatchObject({
      status: 413,
      code: 'file_too_large',
    })
  })

  it('recusa tipo não suportado', async () => {
    const file: UploadedFile = {
      size: 10,
      mimetype: 'image/gif',
      originalname: 'a.gif',
      buffer: Buffer.from(''),
    }
    await expect(service.upload('t1', customer, file)).rejects.toMatchObject({
      status: 415,
      code: 'unsupported_type',
    })
  })

  it('não deixa outro cliente enviar', async () => {
    await expect(service.upload('t1', otherCustomer, undefined)).rejects.toMatchObject({ status: 404 })
  })
})
