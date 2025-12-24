#!/bin/bash

# Script de setup para Vanta.io

echo "🚀 Configurando Vanta.io..."

# Setup Backend
echo "📦 Instalando dependências do Backend..."
cd backend
npm install
cp .env.example .env
echo "✅ Backend configurado!"

# Setup Frontend
echo "📦 Instalando dependências do Frontend..."
cd ../frontend
npm install
echo "✅ Frontend configurado!"

echo ""
echo "🎉 Setup completo!"
echo ""
echo "Para iniciar a aplicação:"
echo "1. Terminal 1 (Backend): cd backend && npm start"
echo "2. Terminal 2 (Frontend): cd frontend && npm start"
echo ""
echo "Certifique-se de que PostgreSQL está configurado!"
echo "Configure DATABASE_URL no arquivo backend/.env"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
