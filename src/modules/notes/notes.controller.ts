import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { SessionUser } from '../auth/session.service.js';
import { CreateNoteDto, NoteDto, UpdateNoteDto } from './dto/note.schema.js';
import { NotesService } from './notes.service.js';

@Controller('notes')
@UseGuards(SessionAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ZodResponse({ type: NoteDto })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateNoteDto) {
    return this.notesService.create(user.sub, dto);
  }

  @Get()
  @ZodResponse({ type: [NoteDto] })
  findAll(@CurrentUser() user: SessionUser) {
    return this.notesService.findAll(user.sub);
  }

  @Get(':id')
  @ZodResponse({ type: NoteDto })
  findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.notesService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ZodResponse({ type: NoteDto })
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.notesService.remove(user.sub, id);
  }
}
