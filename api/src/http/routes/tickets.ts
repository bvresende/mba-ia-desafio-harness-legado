import { Router } from 'express'
import multer from 'multer'
import { Reply, Ticket } from '../../domain/ticket'
import { AttachmentService } from '../../services/attachment-service'
import { TicketService } from '../../services/ticket-service'
import { asyncHandler } from '../errors'
import { requireAuth, requireUser } from '../middlewares/auth'

const upload = multer({ storage: multer.memoryStorage() })

function toTicketJson(t: Ticket) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    category: t.category,
    priority: t.priority,
    triageStatus: t.triageStatus,
    customerId: t.customerId,
    assigneeId: t.assigneeId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

function toReplyJson(r: Reply) {
  return {
    id: r.id,
    ticketId: r.ticketId,
    authorId: r.authorId,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: r.author,
  }
}

export function createTicketRoutes(ticketService: TicketService, attachmentService: AttachmentService) {
  const router = Router()

  router.use(requireAuth)

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await ticketService.list(requireUser(req), {
        status: req.query.status,
        page: req.query.page,
      })
      res.json({ ...result, items: result.items.map(toTicketJson) })
    }),
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const ticket = await ticketService.create(requireUser(req), req.body)
      res.status(201).json(toTicketJson(ticket))
    }),
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const ticket = await ticketService.getDetails(requireUser(req), req.params.id)
      res.json({
        ...toTicketJson(ticket),
        replies: ticket.replies.map(toReplyJson),
        attachments: ticket.attachments,
      })
    }),
  )

  router.post(
    '/:id/assign',
    asyncHandler(async (req, res) => {
      const ticket = await ticketService.assign(requireUser(req), req.params.id)
      res.json(toTicketJson(ticket))
    }),
  )

  router.post(
    '/:id/resolve',
    asyncHandler(async (req, res) => {
      const ticket = await ticketService.resolve(requireUser(req), req.params.id)
      res.json(toTicketJson(ticket))
    }),
  )

  router.post(
    '/:id/replies',
    asyncHandler(async (req, res) => {
      const reply = await ticketService.addReply(requireUser(req), req.params.id, req.body)
      res.status(201).json(toReplyJson(reply))
    }),
  )

  router.post(
    '/:id/attachments',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const attachment = await attachmentService.upload(req.params.id, req.user, req.file)
      res.status(201).json(attachment)
    }),
  )

  router.post(
    '/:id/suggest-reply',
    asyncHandler(async (req, res) => {
      const result = await ticketService.suggestReply(requireUser(req), req.params.id)
      res.json(result)
    }),
  )

  return router
}
