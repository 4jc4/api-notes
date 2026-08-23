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

// z.date() não tem representação em JSON Schema (datas não são um tipo
// JSON) — o Prisma devolve Date, mas o corpo da resposta HTTP é sempre
// ISO string. Um codec deixa a validação em runtime usar Date (o valor
// real devolvido pelo service) e a documentação/serialização OpenAPI
// usar string ISO (o formato que efetivamente trafega no wire).
const dateTimeCodec = z.codec(z.iso.datetime(), z.date(), {
  decode: (isoString) => new Date(isoString),
  encode: (date) => date.toISOString(),
});

const nullableDateTimeCodec = z.codec(
  z.iso.datetime().nullable(),
  z.date().nullable(),
  {
    decode: (isoString) => (isoString === null ? null : new Date(isoString)),
    encode: (date) => (date === null ? null : date.toISOString()),
  },
);

// Formato de saída (o que a API de fato devolve para uma Note) — usado
// para documentação OpenAPI e serialização de resposta via @ZodResponse.
export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string().nullable(),
  ownerId: z.uuid(),
  createdAt: dateTimeCodec,
  updatedAt: dateTimeCodec,
  deletedAt: nullableDateTimeCodec,
});

export class NoteDto extends createZodDto(noteSchema, { codec: true }) {}
