# Infraestrutura — API Notas

## Host e inventário

```text
Proxmox:      cardoso@192.168.1.24
hostname:     pve
plataforma:   Raspberry Pi 4 / ARM64
rede:         192.168.1.0/24
gateway:      192.168.1.1
```

| VMID | Hostname | IP             | Função                               |
| ---: | -------- | -------------- | ------------------------------------ |
|  101 | postgres | `192.168.1.30` | PostgreSQL, database `notes`         |
|  102 | api      | `192.168.1.31` | NestJS em Docker                     |
|  103 | runner   | `192.168.1.32` | runners GitHub Actions               |
|  104 | proxy    | `192.168.1.33` | Nginx e caminho do Cloudflare Tunnel |
|  105 | frontend | `192.168.1.34` | Next.js em Docker                    |

Ordem de boot configurada:

```text
101 PostgreSQL → 102 API → 105 Frontend → 104 Proxy → 103 Runner
```

## LXC 102 — API

```text
usuário de deploy: deploy
diretório:          /opt/app
compose:            /opt/app/docker-compose.yml
segredos:           /opt/app/.env
container:          app-api-1
porta:              3000
healthcheck:        /health
```

O `.env` contém `DATABASE_URL`, `SESSION_SECRET` e `SESSION_TTL`. Nunca documentar seus valores.

## LXC 101 — PostgreSQL

O banco `notes` persiste usuários, sessões e notas. Ele não é exposto publicamente; a API o acessa pela rede interna.

## LXC 103 — Runner

Existem duas instalações independentes:

```text
actions.runner.4jc4-api-notes.lxc-runner.service
actions.runner.4jc4-web-notes.lxc-runner-web.service
```

O runner da API acessa `deploy@192.168.1.31` por SSH. O runner é orquestrador, não host permanente da aplicação.

## LXC 104 — Proxy

O virtual host `notas.ajca.com.br` encaminha:

```text
/       → http://192.168.1.34:3000
/api/*  → http://192.168.1.31:3000/*
```

O `/` final em `proxy_pass` da localização `/api/` remove o prefixo `/api`. O backup conhecido da configuração anterior está em:

```text
/etc/nginx/backups/notas.ajca.com.br.bak-20260823
```

## Registro e arquitetura

```text
registry: ghcr.io
platform: linux/arm64
```

Imagens de produção devem ser rastreáveis por SHA.

## Segredos e segurança

Nunca registrar ou commitar senhas, hashes, cookies, tokens de runner, credenciais do banco, credenciais Cloudflare ou chaves SSH privadas. IPs internos podem constar apenas na documentação e configuração de infraestrutura; nunca no bundle client-side.

Ainda requer atenção operacional: não há política de backup documentada/validada para os LXCs e PostgreSQL, e o firewall do Proxmox não estava habilitado durante o inventário inicial.
