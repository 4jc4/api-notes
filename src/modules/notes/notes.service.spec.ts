import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotesService } from './notes.service.js';

interface MockNote {
  id: string;
  ownerId: string;
  deletedAt: Date | null;
}

describe('NotesService', () => {
  let service: NotesService;
  let prisma: {
    note: {
      create: jest.Mock<(...args: any[]) => Promise<MockNote>>;
      findMany: jest.Mock<(...args: any[]) => Promise<MockNote[]>>;
      findFirst: jest.Mock<(...args: any[]) => Promise<MockNote | null>>;
      update: jest.Mock<(...args: any[]) => Promise<MockNote>>;
    };
  };

  const OWNER_ID = 'owner-uuid';
  const OTHER_USER_ID = 'other-uuid';
  const NOTE_ID = 'note-uuid';

  beforeEach(async () => {
    prisma = {
      note: {
        create: jest.fn<(...args: any[]) => Promise<MockNote>>(),
        findMany: jest.fn<(...args: any[]) => Promise<MockNote[]>>(),
        findFirst: jest.fn<(...args: any[]) => Promise<MockNote | null>>(),
        update: jest.fn<(...args: any[]) => Promise<MockNote>>(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [NotesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(NotesService);
  });

  describe('findOne', () => {
    it('retorna a nota quando o usuário é o dono', async () => {
      const note = { id: NOTE_ID, ownerId: OWNER_ID, deletedAt: null };
      prisma.note.findFirst.mockResolvedValue(note);

      const result = await service.findOne(OWNER_ID, NOTE_ID);

      expect(result).toEqual(note);
    });

    it('lança NotFoundException quando a nota não existe', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(service.findOne(OWNER_ID, NOTE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança ForbiddenException quando a nota pertence a outro usuário', async () => {
      const note = { id: NOTE_ID, ownerId: OTHER_USER_ID, deletedAt: null };
      prisma.note.findFirst.mockResolvedValue(note);

      await expect(service.findOne(OWNER_ID, NOTE_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('aplica soft delete (deletedAt) em vez de apagar o registro', async () => {
      const note = { id: NOTE_ID, ownerId: OWNER_ID, deletedAt: null };
      prisma.note.findFirst.mockResolvedValue(note);
      prisma.note.update.mockResolvedValue({ ...note, deletedAt: new Date() });

      await service.remove(OWNER_ID, NOTE_ID);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
        data: { deletedAt: expect.any(Date) as unknown as Date },
      });
    });

    it('não permite remover nota de outro usuário', async () => {
      const note = { id: NOTE_ID, ownerId: OTHER_USER_ID, deletedAt: null };
      prisma.note.findFirst.mockResolvedValue(note);

      await expect(service.remove(OWNER_ID, NOTE_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.note.update).not.toHaveBeenCalled();
    });
  });
});
