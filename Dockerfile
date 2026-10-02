FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH="/app/backend:/app"

# Copy uv binary directly from official image for ultra-fast setup
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set PATH to include python venv
ENV PATH="/app/.venv/bin:$PATH"

# Minimal runtime dependencies (no heavy compilers like gcc or postgresql-server-dev-all)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project dependency files
COPY pyproject.toml uv.lock ./

# Install python dependencies from pre-built wheels
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY ./backend /app/backend

# Expose port
EXPOSE 8000

# Command to run application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]