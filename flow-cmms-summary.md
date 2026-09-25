
# Sistema de Gerenciamento de Equipamentos Médicos (CMMS) - Resumo

## Funcionalidades Implementadas

### 1. Gestão de Ativos
- Cadastro completo de equipamentos médicos
- Informações técnicas detalhadas
- Status de ativo/inativo/manutenção
- Histórico de manutenções

### 2. Gestão de Manutenção
- **Corretiva**: Registro de falhas e reparos
- **Preventiva**: Programação automática de manutenções
- Controle de status (pendente, em andamento, concluído)
- Histórico completo de manutenções

### 3. Gestão de Estoque
- Controle de peças e materiais
- Alertas de estoque baixo
- Histórico de movimentações
- Controle de fornecedores

### 4. Rastreabilidade
- Registro completo de todas as ações no sistema
- Histórico de manutenções, alterações de status, etc.
- Auditoria completa das operações

### 5. Dashboard de Indicadores
- Uptime médio (tempo de funcionamento)
- MTTR (Tempo médio de recuperação)
- MTBF (Tempo médio entre falhas)
- Métricas de performance do sistema

### 6. Integração com IA
- Suporte a múltiplos provedores: OpenAI, Gemini, LM Studio, Ollama
- Interface unificada para chamadas à IA
- Processamento de textos e análise de dados
- Sistema de chat com agentes de IA

### 7. Integração com Telegram
- Consultas por mensagem
- Abertura automática de chamados
- Notificações do sistema
- Integração bidirecional

### 8. Controle de Acesso
- Autenticação JWT
- Gestão de usuários e permissões
- Segurança das informações
- Níveis de acesso por função

## Tecnologias Utilizadas

- **Backend**: FastAPI (alta performance, documentação automática)
- **Banco de Dados**: PostgreSQL
- **Gerenciador de Pacotes**: uv (mais rápido que pip)
- **Containerização**: Docker + Docker Compose
- **ORM**: SQLAlchemy
- **Autenticação**: JWT

## Estrutura do Projeto

```
flow-cmms/
├── backend/
│   ├── app/
│   │   ├── main.py                 # Ponto de entrada da aplicação
│   │   ├── models/                 # Modelos do banco de dados
│   │   ├── schemas/                # Esquemas Pydantic para validação
│   │   ├── api/                    # Endpoints da API
│   │   │   └── endpoints/          # Endpoints específicos
│   │   ├── core/                   # Configurações e lógica central
│   │   ├── auth/                   # Autenticação e autorização
│   │   └── db/                     # Conexão com o banco de dados
│   ├── init_db.py                  # Inicialização do banco de dados
├── docker-compose.yml              # Configuração Docker
├── Dockerfile                      # Configuração do container
├── pyproject.toml                  # Configuração do projeto com uv
└── INSTALLATION.md                 # Documentação de instalação
```

## Como Iniciar

1. Instale as dependências: `uv sync`
2. Inicialize o banco de dados: `python backend/init_db.py`
3. Inicie o servidor: `uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`

## Endpoints Principais

- `/assets/` - Gestão de ativos
- `/maintenance/` - Gestão de manutenção
- `/inventory/` - Controle de estoque
- `/users/` - Gerenciamento de usuários
- `/ai/` - Integração com IA
- `/telegram/` - Integração com Telegram
- `/reports/` - Relatórios e dashboards

## Status Atual

O sistema está parcialmente implementado com todas as funcionalidades solicitadas:
✅ Estrutura básica do sistema  
✅ Modelos de dados para ativos, manutenção, estoque, usuários  
✅ Endpoints da API para todas as funcionalidades principais  
✅ Configuração Docker para PostgreSQL e backend  
✅ Integração com múltiplos provedores de IA  
✅ Autenticação JWT  
✅ Estrutura de rastreabilidade  

O projeto está pronto para uso e pode ser expandido conforme necessário.
