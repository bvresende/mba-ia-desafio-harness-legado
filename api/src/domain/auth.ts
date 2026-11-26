export type Role = 'customer' | 'agent' | 'admin'

export interface AuthUser {
  id: string
  role: Role
  email?: string
}

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  createdAt: Date
}

export interface PublicUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}
