import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

export class CreateNoteDto extends createZodDto(createNoteSchema) {}

export const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

export class UpdateNoteDto extends createZodDto(updateNoteSchema) {}
