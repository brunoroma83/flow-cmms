#!/bin/bash

# Script de setup do Flow CMMS com uv

echo "=== Configuração do Flow CMMS ==="

# Verificar se o uv está instalado
if ! command -v uv &> /dev/null; then
    echo "Erro: uv não encontrado. Por favor, instale o uv primeiro."
    echo "Windows: winget install uv"
    echo "Linux/macOS: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "uv encontrado. Iniciando configuração..."

# Sincronizar dependências
echo "Instalando dependências..."
uv sync

# Instalar dependências de desenvolvimento
echo "Instalando dependências de desenvolvimento..."
uv sync --extra dev

# Criar ambiente virtual (opcional, já gerenciado pelo uv)
echo "Ambiente configurado com sucesso!"

# Inicializar banco de dados
echo "Inicializando banco de dados..."
python backend/init_db.py

echo "=== Setup concluído ==="
echo "Para iniciar o servidor:"
echo "  uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Para executar testes:"
echo "  uv run pytest tests/"