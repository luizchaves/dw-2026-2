/**
 * Especificação OpenAPI 3.0 da API, escrita à mão como um objeto TypeScript.
 *
 * É a mesma informação que o `requests.http` já carrega em forma de exemplos,
 * mas num formato que ferramentas entendem: o Swagger UI monta a página
 * interativa a partir daqui, e qualquer cliente (Insomnia, Postman, geradores
 * de SDK) importa o JSON de `/api/docs.json`.
 *
 * Os `$ref` apontam para `components.schemas`, logo no fim do arquivo: o
 * formato de um host é descrito **uma vez** e reaproveitado por todas as rotas
 * que o devolvem.
 */

/** Toda rota autenticada repete este bloco, então ele ganha um nome. */
const bearerAuth = [{ bearerAuth: [] }];

/** Atalho para `application/json` com um `$ref` de schema e um exemplo. */
function json(schema: object, example?: unknown) {
  return {
    'application/json': {
      schema,
      ...(example === undefined ? {} : { example }),
    },
  };
}

/** Referência a um schema de `components.schemas`. */
function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

/** Lista de um schema de `components.schemas`. */
function arrayOf(name: string) {
  return { type: 'array', items: ref(name) };
}

/** Resposta de erro — o formato é sempre `{ error, issues? }`. */
function error(description: string, example?: unknown) {
  return {
    description,
    content: json(ref('ErrorResponse'), example),
  };
}

/**
 * O `id` de host e de tag é sempre um UUID na rota: o schema Zod recusa
 * qualquer outra coisa antes de o controller rodar.
 */
const idParam = {
  in: 'path',
  name: 'id',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const unauthorized = error('Token ausente, mal formado ou expirado', {
  error: 'Token invalid',
});

const validationError = error(
  'Erro de validação (corpo, query ou parâmetro de rota) ou Content-Type diferente de application/json',
  {
    error: 'Validation error',
    issues: [
      {
        code: 'too_small',
        path: ['body', 'name'],
        message: 'O nome deve ter no mínimo 3 caracteres',
      },
    ],
  },
);

const hostExample = {
  id: '6a1f6b7e-0c2d-4a3b-9e5f-1c2d3e4f5a6b',
  name: 'Google DNS',
  address: '8.8.8.8',
  createdAt: '2026-11-19T12:00:00.000Z',
  userId: 'b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
  tags: [
    { id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b', name: 'dns', color: '#64748b' },
  ],
  pings: [
    {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      latency: 12,
      success: true,
      createdAt: '2026-11-19T12:01:00.000Z',
      hostId: '6a1f6b7e-0c2d-4a3b-9e5f-1c2d3e4f5a6b',
    },
  ],
};

const userExample = {
  id: 'b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
  name: 'Carla',
  email: 'carla@example.com',
  role: 'user',
  createdAt: '2026-11-19T12:00:00.000Z',
};

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Monitor App API',
    version: '1.0.0',
    description: [
      'API de monitoramento de hosts: cadastro de usuários, autenticação com JWT,',
      'CRUD de hosts com tags e histórico de medições de ping.',
      '',
      '**Autenticação** — exceto `POST /users` e `POST /signin`, toda rota exige o',
      'cabeçalho `Authorization: Bearer <token>`. O token sai de `POST /signin`.',
      'No Swagger UI, use o botão **Authorize** e cole apenas o token (sem `Bearer`).',
      '',
      '**Erros** — a resposta de erro é sempre `{ "error": "..." }`. Quando a falha',
      'vem da validação, vem acompanhada de `issues`, com um item por campo.',
    ].join('\n'),
  },
  servers: [{ url: 'http://localhost:3000', description: 'Servidor local' }],
  tags: [
    { name: 'Users', description: 'Cadastro e dados do usuário autenticado' },
    { name: 'Auth', description: 'Login e emissão de token' },
    { name: 'Hosts', description: 'CRUD dos hosts monitorados' },
    { name: 'Pings', description: 'Histórico e medição de disponibilidade' },
    { name: 'Tags', description: 'Vocabulário compartilhado de categorias' },
  ],

  paths: {
    '/api/users': {
      post: {
        tags: ['Users'],
        summary: 'Cadastra um novo usuário',
        description:
          'Rota pública. O cadastro **não** autentica: o usuário criado ainda precisa chamar `POST /signin`. A senha nunca volta na resposta.',
        requestBody: {
          required: true,
          content: json(ref('CreateUserRequest'), {
            name: 'Carla',
            email: 'carla@example.com',
            password: 'senha-de-desenvolvimento',
            confirmationPassword: 'senha-de-desenvolvimento',
          }),
        },
        responses: {
          201: {
            description: 'Usuário criado',
            content: json(ref('UserResponse'), userExample),
          },
          400: validationError,
          409: error('E-mail já cadastrado', { error: 'Email already exists' }),
        },
      },
    },

    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Retorna o usuário do token enviado',
        security: bearerAuth,
        responses: {
          200: {
            description: 'Usuário autenticado',
            content: json(ref('UserResponse'), userExample),
          },
          401: unauthorized,
        },
      },
    },

    '/api/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica o usuário e devolve um JWT',
        description:
          'Rota pública. E-mail inexistente e senha errada devolvem a **mesma** resposta 401: distinguir os dois casos entregaria a lista de e-mails cadastrados.',
        requestBody: {
          required: true,
          content: json(ref('SigninRequest'), {
            email: 'carla@example.com',
            password: 'senha-de-desenvolvimento',
          }),
        },
        responses: {
          200: {
            description: 'Login realizado',
            content: json(ref('SigninResponse'), {
              auth: userExample,
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.assinatura',
            }),
          },
          400: validationError,
          401: error('Credenciais inválidas', { error: 'Invalid credentials' }),
        },
      },
    },

    '/api/hosts': {
      get: {
        tags: ['Hosts'],
        summary: 'Lista os hosts do usuário autenticado',
        description:
          'Só os hosts do dono do token. Os filtros são combináveis: `?name=dns&tag=producao`.',
        security: bearerAuth,
        parameters: [
          {
            in: 'query',
            name: 'name',
            required: false,
            schema: { type: 'string' },
            description: 'Busca parcial pelo nome do host',
          },
          {
            in: 'query',
            name: 'tag',
            required: false,
            schema: { type: 'string' },
            description: 'Nome exato de uma tag associada ao host',
          },
        ],
        responses: {
          200: {
            description: 'Lista de hosts',
            content: json(arrayOf('HostResponse'), [hostExample]),
          },
          400: validationError,
          401: unauthorized,
        },
      },
      post: {
        tags: ['Hosts'],
        summary: 'Cadastra um host',
        description:
          'O dono vem do token, não do corpo. As tags são enviadas por **nome**: a que não existe é criada na hora, com uma cor neutra.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: json(ref('HostRequest'), {
            name: 'Google DNS',
            address: '8.8.8.8',
            tags: ['dns', 'producao'],
          }),
        },
        responses: {
          201: {
            description: 'Host criado',
            content: json(ref('HostResponse'), hostExample),
          },
          400: validationError,
          401: unauthorized,
          409: error('O usuário já tem um host com esse nome', {
            error: 'Host já cadastrado com esse nome',
          }),
        },
      },
    },

    '/api/hosts/{id}': {
      get: {
        tags: ['Hosts'],
        summary: 'Busca um host pelo id',
        description:
          'O host de outro usuário responde 404, como se não existisse — a consulta é escopada pelo dono.',
        security: bearerAuth,
        parameters: [{ ...idParam, description: 'Id do host' }],
        responses: {
          200: {
            description: 'Host encontrado',
            content: json(ref('HostResponse'), hostExample),
          },
          400: validationError,
          401: unauthorized,
          404: error('Host não encontrado', { error: 'Host not found' }),
        },
      },
      put: {
        tags: ['Hosts'],
        summary: 'Atualiza um host',
        description:
          'Substituição completa: a lista de `tags` enviada passa a ser a lista do host, e os vínculos antigos são desfeitos.',
        security: bearerAuth,
        parameters: [{ ...idParam, description: 'Id do host' }],
        requestBody: {
          required: true,
          content: json(ref('HostRequest'), {
            name: 'Cloudflare DNS',
            address: '1.1.1.1',
            tags: ['dns'],
          }),
        },
        responses: {
          200: {
            description: 'Host atualizado',
            content: json(ref('HostResponse'), {
              ...hostExample,
              name: 'Cloudflare DNS',
              address: '1.1.1.1',
            }),
          },
          400: validationError,
          401: unauthorized,
          404: error('Host não encontrado', { error: 'Host not found' }),
          409: error('O usuário já tem um host com esse nome', {
            error: 'Host já cadastrado com esse nome',
          }),
        },
      },
      delete: {
        tags: ['Hosts'],
        summary: 'Remove um host',
        description: 'O histórico de pings do host é apagado junto (cascade).',
        security: bearerAuth,
        parameters: [{ ...idParam, description: 'Id do host' }],
        responses: {
          204: { description: 'Host removido (sem corpo na resposta)' },
          400: validationError,
          401: unauthorized,
          404: error('Host não encontrado', { error: 'Host not found' }),
        },
      },
    },

    '/api/hosts/{id}/pings': {
      get: {
        tags: ['Pings'],
        summary: 'Histórico de medições de um host',
        description:
          'Da medição mais recente para a mais antiga. Um host sem histórico devolve `[]`; o host de outro usuário devolve 404.',
        security: bearerAuth,
        parameters: [
          { ...idParam, description: 'Id do host' },
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            description: 'Quantidade máxima de medições retornadas',
          },
        ],
        responses: {
          200: {
            description: 'Histórico de medições',
            content: json(arrayOf('PingResponse'), [
              {
                id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
                latency: 12,
                success: true,
                createdAt: '2026-11-19T12:01:00.000Z',
                hostId: '6a1f6b7e-0c2d-4a3b-9e5f-1c2d3e4f5a6b',
              },
              {
                id: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
                latency: null,
                success: false,
                createdAt: '2026-11-19T11:56:00.000Z',
                hostId: '6a1f6b7e-0c2d-4a3b-9e5f-1c2d3e4f5a6b',
              },
            ]),
          },
          400: validationError,
          401: unauthorized,
          404: error('Host não encontrado', { error: 'Host not found' }),
        },
      },
      post: {
        tags: ['Pings'],
        summary: 'Mede o host agora e grava o resultado',
        description:
          'A medição não tem corpo. A falha também é gravada: um host fora do ar entra no histórico como `success: false, latency: null` — é isso que transforma o histórico num registro de disponibilidade, e não numa lista de sucessos.',
        security: bearerAuth,
        parameters: [
          { ...idParam, description: 'Id do host' },
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            description:
              'Aceito porque a rota reusa o schema do histórico, mas sem efeito aqui',
          },
        ],
        responses: {
          201: {
            description: 'Medição realizada e gravada',
            content: json(ref('PingResponse'), {
              id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
              latency: 12,
              success: true,
              createdAt: '2026-11-19T12:01:00.000Z',
              hostId: '6a1f6b7e-0c2d-4a3b-9e5f-1c2d3e4f5a6b',
            }),
          },
          400: validationError,
          401: unauthorized,
          404: error('Host não encontrado', { error: 'Host not found' }),
        },
      },
    },

    '/api/tags': {
      get: {
        tags: ['Tags'],
        summary: 'Lista as tags',
        description:
          'As tags são um vocabulário compartilhado entre os usuários — a lista não é escopada pelo dono, mas só quem está autenticado a lê.',
        security: bearerAuth,
        parameters: [
          {
            in: 'query',
            name: 'name',
            required: false,
            schema: { type: 'string' },
            description: 'Busca parcial pelo nome da tag',
          },
        ],
        responses: {
          200: {
            description: 'Lista de tags, em ordem alfabética',
            content: json(arrayOf('TagResponse'), [
              {
                id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
                name: 'dns',
                color: '#64748b',
              },
            ]),
          },
          400: validationError,
          401: unauthorized,
        },
      },
      post: {
        tags: ['Tags'],
        summary: 'Cria uma tag',
        description:
          'Criação explícita, com cor escolhida. A tag citada por nome ao cadastrar um host é criada automaticamente, com uma cor neutra.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: json(ref('TagRequest'), {
            name: 'producao',
            color: '#2563eb',
          }),
        },
        responses: {
          201: {
            description: 'Tag criada',
            content: json(ref('TagResponse'), {
              id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
              name: 'producao',
              color: '#2563eb',
            }),
          },
          400: validationError,
          401: unauthorized,
          409: error('Já existe uma tag com esse nome', {
            error: 'Tag already exists',
          }),
        },
      },
    },

    '/api/tags/{id}': {
      get: {
        tags: ['Tags'],
        summary: 'Busca uma tag pelo id',
        security: bearerAuth,
        parameters: [{ ...idParam, description: 'Id da tag' }],
        responses: {
          200: {
            description: 'Tag encontrada',
            content: json(ref('TagResponse'), {
              id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
              name: 'dns',
              color: '#64748b',
            }),
          },
          400: validationError,
          401: unauthorized,
          404: error('Tag não encontrada', { error: 'Tag not found' }),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token devolvido por `POST /api/signin`, enviado como `Authorization: Bearer <token>`.',
      },
    },

    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', description: 'Mensagem legível do erro' },
          issues: {
            type: 'array',
            description:
              'Detalhes por campo, presentes só nos erros de validação',
            items: { type: 'object' },
          },
        },
      },

      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          confirmationPassword: {
            type: 'string',
            description:
              'Opcional. Quando enviada, precisa ser igual a `password`. Não vai para o banco: é exigência da interface, não do domínio.',
          },
        },
      },

      UserResponse: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'createdAt'],
        description: 'O campo `password` nunca sai do banco.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', example: 'user' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      SigninRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email' },
          password: {
            type: 'string',
            minLength: 1,
            description:
              'Sem mínimo de tamanho aqui: senha curta é 401 ("credenciais inválidas"), não erro de validação.',
          },
        },
      },

      SigninResponse: {
        type: 'object',
        required: ['auth', 'token'],
        properties: {
          auth: ref('UserResponse'),
          token: { type: 'string', description: 'JWT de acesso' },
        },
      },

      HostRequest: {
        type: 'object',
        required: ['name', 'address'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 3 },
          address: {
            type: 'string',
            description: 'IPv4 ou nome de domínio (ex.: `8.8.8.8`, `google.com`)',
          },
          tags: {
            type: 'array',
            default: [],
            description: 'Nomes das tags. A tag que não existe é criada na hora.',
            items: { type: 'string', minLength: 1 },
          },
        },
      },

      HostResponse: {
        type: 'object',
        required: ['id', 'name', 'address', 'createdAt', 'userId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          address: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          userId: { type: 'string', format: 'uuid' },
          tags: arrayOf('TagResponse'),
          pings: {
            ...arrayOf('PingResponse'),
            description: 'As 10 medições mais recentes do host',
          },
        },
      },

      TagRequest: {
        type: 'object',
        required: ['name', 'color'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 2 },
          color: {
            type: 'string',
            pattern: '^#[0-9a-fA-F]{6}$',
            example: '#2563eb',
          },
        },
      },

      TagResponse: {
        type: 'object',
        required: ['id', 'name', 'color'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          color: { type: 'string', example: '#64748b' },
        },
      },

      PingResponse: {
        type: 'object',
        required: ['id', 'success', 'createdAt', 'hostId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          latency: {
            type: 'integer',
            nullable: true,
            description:
              'Latência em milissegundos. `null` quando o host não respondeu: a medição existe, a latência não.',
          },
          success: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          hostId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
};

export default swaggerSpec;
