import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { env } from '../config/env'
import { AuthUser, UploadedFile } from '../domain/auth'
import { AppError } from '../domain/errors'
import { AttachmentRepository } from '../repositories/attachment-repository'
import { TicketService } from './ticket-service'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain']

export class AttachmentService {
  constructor(
    private attachments: AttachmentRepository,
    private tickets: TicketService,
  ) {}

  async upload(ticketId: string, user: AuthUser | undefined, file: UploadedFile | undefined) {
    if (!user) {
      throw new AppError(401, 'unauthorized', 'Token ausente')
    }
    await this.tickets.getById(user, ticketId)

    if (!file) {
      throw new AppError(422, 'validation_error', 'Envie o arquivo no campo file')
    }
    if (file.size > MAX_SIZE) {
      throw new AppError(413, 'file_too_large', 'O arquivo pode ter no máximo 5 MB')
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new AppError(415, 'unsupported_type', 'Tipo de arquivo não suportado')
    }

    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true })
    const storedName = crypto.randomUUID() + path.extname(file.originalname)
    fs.writeFileSync(path.join(env.UPLOAD_DIR, storedName), file.buffer)

    return this.attachments.create({
      ticketId,
      uploaderId: user.id,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    })
  }

  async getForDownload(user: AuthUser, attachmentId: string) {
    const attachment = await this.attachments.findById(attachmentId)
    if (!attachment) {
      throw new AppError(404, 'not_found', 'Anexo não encontrado')
    }
    try {
      await this.tickets.getById(user, attachment.ticketId)
    } catch {
      throw new AppError(404, 'not_found', 'Anexo não encontrado')
    }
    return { attachment, filePath: path.join(env.UPLOAD_DIR, attachment.storedName) }
  }
}
