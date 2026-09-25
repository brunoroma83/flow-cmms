FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH="/app/backend:/app"

# Install system dependencies including curl and PostgreSQL development headers
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    libpq-dev \
    postgresql-server-dev-all \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Set PATH to include uv and python venv
ENV PATH="/app/.venv/bin:/root/.local/bin:$PATH"

# Copy project files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY ./backend /app/backend

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]