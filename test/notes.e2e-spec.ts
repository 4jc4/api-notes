import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Notes (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let aliceToken: string;
  let bobToken: string;
  let aliceNoteId: string;

  const TEST_EMAILS = ['alice.e2e@example.com', 'bob.e2e@example.com'];

  async function cleanupTestData() {
    await prisma.note.deleteMany({
      where: { owner: { email: { in: TEST_EMAILS } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: TEST_EMAILS } },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    await cleanupTestData();

    const passwordHash = (await argon2.hash('senha123')) as string;

    await prisma.user.create({
      data: { email: 'alice.e2e@example.com', passwordHash },
    });
    await prisma.user.create({
      data: { email: 'bob.e2e@example.com', passwordHash },
    });

    const aliceLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'alice.e2e@example.com', password: 'senha123' });
    aliceToken = (aliceLogin.body as { accessToken: string }).accessToken;

    const bobLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'bob.e2e@example.com', password: 'senha123' });
    bobToken = (bobLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it('Alice cria uma nota', async () => {
    const response = await request(httpServer)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Nota da Alice', content: 'Conteúdo secreto' })
      .expect(201);

    aliceNoteId = (response.body as { id: string }).id;
    expect(aliceNoteId).toBeDefined();
  });

  it('Alice acessa a própria nota (200)', async () => {
    await request(httpServer)
      .get(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
  });

  it('Bob NÃO acessa a nota da Alice (403)', async () => {
    const response = await request(httpServer)
      .get(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      status: 403,
      title: 'You do not have access to this note',
    });
  });

  it('rejeita requisição sem token (401)', async () => {
    await request(httpServer).get(`/notes/${aliceNoteId}`).expect(401);
  });

  it('rejeita criação de nota sem título (400)', async () => {
    await request(httpServer)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'sem título' })
      .expect(400);
  });
});
