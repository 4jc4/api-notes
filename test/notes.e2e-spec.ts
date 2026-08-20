import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import request, { type Agent } from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Notes (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let aliceAgent: Agent;
  let bobAgent: Agent;
  let aliceNoteId: string;

  const TEST_EMAILS = ['alice.e2e@example.com', 'bob.e2e@example.com'];

  async function cleanupTestData() {
    await prisma.note.deleteMany({
      where: { owner: { email: { in: TEST_EMAILS } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: TEST_EMAILS } } },
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
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.use(cookieParser());
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

    // request.agent() persiste o cookie de sessão entre requisições,
    // como um navegador real faria.
    aliceAgent = request.agent(httpServer);
    bobAgent = request.agent(httpServer);

    await aliceAgent
      .post('/api/v1/auth/login')
      .send({ email: 'alice.e2e@example.com', password: 'senha123' })
      .expect(200);

    await bobAgent
      .post('/api/v1/auth/login')
      .send({ email: 'bob.e2e@example.com', password: 'senha123' })
      .expect(200);
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it('Alice cria uma nota', async () => {
    const response = await aliceAgent
      .post('/api/v1/notes')
      .send({ title: 'Nota da Alice', content: 'Conteúdo secreto' })
      .expect(201);

    aliceNoteId = (response.body as { id: string }).id;
    expect(aliceNoteId).toBeDefined();
  });

  it('Alice acessa a própria nota (200)', async () => {
    await aliceAgent.get(`/api/v1/notes/${aliceNoteId}`).expect(200);
  });

  it('Bob NÃO acessa a nota da Alice (403)', async () => {
    const response = await bobAgent
      .get(`/api/v1/notes/${aliceNoteId}`)
      .expect(403);

    expect(response.body).toMatchObject({
      status: 403,
      title: 'You do not have access to this note',
    });
  });

  it('rejeita requisição sem cookie de sessão (401)', async () => {
    await request(httpServer).get(`/api/v1/notes/${aliceNoteId}`).expect(401);
  });

  it('rejeita criação de nota sem título (400)', async () => {
    await aliceAgent
      .post('/api/v1/notes')
      .send({ content: 'sem título' })
      .expect(400);
  });

  it('logout revoga a sessão (requisições seguintes retornam 401)', async () => {
    const logoutAgent = request.agent(httpServer);

    await logoutAgent
      .post('/api/v1/auth/login')
      .send({ email: 'bob.e2e@example.com', password: 'senha123' })
      .expect(200);

    await logoutAgent.post('/api/v1/auth/logout').expect(204);
    await logoutAgent.get('/api/v1/notes').expect(401);
  });
});
