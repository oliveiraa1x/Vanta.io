#!/bin/bash

# 🚀 Deploy Script para Squarespace Cloud

echo "================================"
echo "  Vanta.io - Deploy Squarespace"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para print colorido
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar pré-requisitos
echo "Verificando pré-requisitos..."

if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado"
    exit 1
fi
print_step "Node.js instalado: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm não encontrado"
    exit 1
fi
print_step "npm instalado: $(npm --version)"

if ! command -v git &> /dev/null; then
    print_error "Git não encontrado"
    exit 1
fi
print_step "Git instalado: $(git --version)"

echo ""
echo "Preparando aplicação para deploy..."

# Build do Frontend
echo ""
print_step "Building frontend..."
cd frontend
npm install
npm run build

if [ ! -d "build" ]; then
    print_error "Build falhou"
    exit 1
fi
print_step "Frontend build concluído"
cd ..

# Instalar dependências do Backend
echo ""
print_step "Instalando dependências do backend..."
cd backend
npm install
cd ..

# Verificar variáveis de ambiente
echo ""
print_warning "Verifique se configurou TODAS as variáveis em backend/.env:"
echo "  - DATABASE_URL (PostgreSQL)"
echo "  - JWT_SECRET"
echo "  - FRONTEND_URL"
echo ""

# Git setup
echo ""
print_step "Configurando repositório Git..."

if [ ! -d ".git" ]; then
    git init
    git config user.email "seu@email.com"
    git config user.name "Deploy Bot"
fi

git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || print_warning "Nada para commitar"

echo ""
echo "================================"
echo "✓ Pronto para deploy!"
echo "================================"
echo ""
echo "Próximos passos:"
echo "1. Configure o remote do Squarespace:"
echo "   git remote add squarespace <seu-url>"
echo ""
echo "2. Faça deploy:"
echo "   git push squarespace main"
echo ""
echo "3. Acompanhe na dashboard:"
echo "   https://squarespace.com/cloud"
echo ""
