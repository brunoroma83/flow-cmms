# Exemplos de Uso do Flow CMMS

## Configuração Inicial

### 1. Instalando dependências com uv
```bash
# Navegue até o diretório do projeto
cd flow-cmms

# Sincronize todas as dependências
uv sync

# Para desenvolvimento, incluindo dependências opcionais
uv sync --extra dev
```

### 2. Configurando variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/cmms_db
SECRET_KEY=sua-chave-secreta-aqui
TELEGRAM_BOT_TOKEN=seu-token-do-telegram-aqui
OPENAI_API_KEY=sua-chave-openai-aqui
GEMINI_API_KEY=sua-chave-gemini-aqui
```

## Execução do Sistema

### Servidor de Desenvolvimento
```bash
# Inicie o servidor com reload automático
uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Servidor de Produção
```bash
# Para produção usando gunicorn
uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.app.main:app
```

## Exemplos de API

### 1. Criar um novo ativo (Equipamento)
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/assets/' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Scanner de Raios X",
    "description": "Scanner de raios X digital",
    "serial_number": "XRAY-001",
    "model": "Digital X-Ray Model 2023",
    "brand": "MedTech",
    "category": "Radiologia",
    "location": "Sala 101",
    "warranty_expiry": "2025-12-31"
  }'
```

### 2. Criar uma ordem de manutenção
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/maintenance/' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "asset_id": 1,
    "maintenance_type": "preventive",
    "description": "Manutenção preventiva mensal",
    "frequency": "monthly",
    "scheduled_date": "2023-10-15T09:00:00"
  }'
```

### 3. Consultar dashboard de indicadores
```bash
curl -X 'GET' \
  'http://localhost:8000/api/v1/reports/dashboard' \
  -H 'accept: application/json'
```

### 4. Usar o serviço de IA
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/ai/query' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Como posso melhorar a manutenção preventiva do equipamento?",
    "provider": "openai"
  }'
```

### 5. Enviar mensagem pelo Telegram
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/telegram/message' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "chat_id": "123456789",
    "text": "Nova solicitação de manutenção recebida"
  }'
```

## Testes

Para executar os testes:
```bash
# Executar testes unitários
uv run pytest
```

## Estrutura do Projeto

- `backend/app/models/` - Definições de modelos do banco de dados
- `backend/app/api/endpoints/` - Endpoints da API REST
- `backend/app/schemas/` - Definições Pydantic para validação de dados
- `backend/app/core/` - Configurações e lógica central do sistema
- `backend/app/auth/` - Módulo de autenticação JWT
- `backend/app/db/` - Conexão com o banco de dados

## Documentação da API

A documentação interativa da API está disponível em:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Integração com IA

O sistema suporta múltiplos motores de IA:

1. **OpenAI** - Configurar `OPENAI_API_KEY`
2. **Gemini** - Configurar `GEMINI_API_KEY`  
3. **LM Studio** - Configurar `LM_STUDIO_API_URL`
4. **Ollama** - Configurar `OLLAMA_API_URL`

## Integração com Telegram

Para usar a integração com Telegram:
1. Criar um bot no @BotFather
2. Obter o token do bot
3. Configurar `TELEGRAM_BOT_TOKEN` no arquivo `.env`
4. O sistema pode enviar notificações e receber comandos via Telegram

## Indicadores Principais

O dashboard fornece os seguintes indicadores:
- **Uptime**: Porcentagem de tempo que os equipamentos estão operacionais
- **MTTR (Mean Time To Repair)**: Tempo médio para reparo
- **MTBF (Mean Time Between Failures)**: Tempo médio entre falhas