import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateNoteDto, UpdateNoteDto } from './dto/note.schema.js';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: { ...dto, ownerId },
    });
  }

  async findAll(ownerId: string) {
    return this.prisma.note.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ownerId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, deletedAt: null },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this note');
    }

    return note;
  }

  async update(ownerId: string, noteId: string, dto: UpdateNoteDto) {
    await this.findOne(ownerId, noteId); // valida existência + ownership

    return this.prisma.note.update({
      where: { id: noteId },
      data: dto,
    });
  }

  async remove(ownerId: string, noteId: string): Promise<void> {
    await this.findOne(ownerId, noteId); // valida existência + ownership

    await this.prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
  }
}
