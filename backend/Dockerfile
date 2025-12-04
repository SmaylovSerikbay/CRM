FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy DejaVu fonts for PDF generation with Cyrillic support
RUN mkdir -p /usr/share/fonts/truetype/dejavu
COPY fonts/*.ttf /usr/share/fonts/truetype/dejavu/

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with pip cache
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD python manage.py makemigrations && python manage.py migrate && python manage.py runserver 0.0.0.0:8000

