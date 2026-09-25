# Instalação do Flow CMMS

Este projeto utiliza o `uv` como gerenciador de pacotes, que é mais rápido e eficiente que o pip tradicional.

## Pré-requisitos

1. **Instale o uv** (se ainda não tiver):
   ```bash
   # Windows (usando PowerShell)
   winget install uv
   ```

2. **Python 3.14** (já incluído com o uv)

## Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd flow-cmms
```

### 2. Instale as dependências
```bash
# Para instalação completa (com todas as dependências)
uv sync

# Para instalação de desenvolvimento (inclui dependências opcionais)
uv sync --extra dev
```

### 3. Configuração do Banco de Dados
O projeto já está configurado para usar PostgreSQL. Certifique-se de que o serviço PostgreSQL esteja rodando.

### 4. Inicialização do Banco de Dados
```bash
# Crie as tabelas no banco de dados
python backend/init_db.py
```

## Execução

### Desenvolvimento
```bash
# Inicie o servidor de desenvolvimento
uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Produção
```bash
# Para produção usando gunicorn
uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.app.main:app
```

## Configuração de API Keys

Para integração com AI providers, crie um arquivo `.env` na raiz do projeto:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/cmms_db
SECRET_KEY=sua-chave-secreta-aqui
TELEGRAM_BOT_TOKEN=seu-token-do-telegram-aqui
OPENAI_API_KEY=sua-chave-openai-aqui
GEMINI_API_KEY=sua-chave-gemini-aqui
LM_STUDIO_API_URL=http://localhost:1234/v1
OLLAMA_API_URL=http://localhost:11434/api
```

## Estrutura do Projeto

- `backend/` - Código principal do backend em FastAPI
- `backend/app/models/` - Definições de modelos do banco de dados
- `backend/app/api/endpoints/` - Endpoints da API
- `backend/app/schemas/` - Definições de Pydantic para validação de dados
- `backend/app/core/` - Configurações e lógica central
- `docker-compose.yml` - Configuração do Docker
- `Dockerfile` - Configuração do container

## Funcionalidades Implementadas

1. **Gestão de Ativos** - Controle completo de equipamentos médicos
2. **Gestão de Manutenção** - Corretiva e preventiva
3. **Gestão de Estoque** - Controle de peças e materiais
4. **Controle de Acesso** - Autenticação JWT
5. **Rastreabilidade** - Histórico completo das ações
6. **Dashboard de Indicadores** - Uptime, MTTR, MTBF
7. **Integração com IA** - OpenAI, Gemini, LM Studio e Ollama
8. **Integração com Telegram** - Consultas e abertura de chamados
9. **Relatórios Avançados** - Diversos relatórios de manutenção e estoque

## Testes

Para executar os testes:
```bash
# Executar testes unitários
uv run pytest
```

## Contribuição

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request