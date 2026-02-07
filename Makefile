.PHONY: help install setup clean dev backend frontend frontend-website frontend-mobile backend-setup frontend-setup frontend-website-setup frontend-mobile-setup backend-install frontend-install

# Python: python3 on macOS/Linux, python on Windows
ifeq ($(OS),Windows_NT)
  PYTHON := python
else
  PYTHON := python3
endif

# Default target
help:
	@echo "🏥 MediSaathi - Available Commands"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup                    - Complete setup (backend + both frontends)"
	@echo "  make backend-setup            - Setup backend only (venv + dependencies)"
	@echo "  make frontend-setup           - Setup both frontends (website + mobile)"
	@echo "  make frontend-website-setup   - Setup website frontend only"
	@echo "  make frontend-mobile-setup     - Setup mobile (Expo) frontend only"
	@echo ""
	@echo "Run Commands:"
	@echo "  make dev                     - Run backend + website frontend"
	@echo "  make backend                 - Run backend server only"
	@echo "  make frontend-website        - Run website (Vite) only"
	@echo "  make frontend-mobile         - Run mobile (Expo) only"
	@echo "  make frontend                - Alias for frontend-website"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean                   - Clean all dependencies and caches"
	@echo "  make backend-install         - Reinstall backend dependencies"
	@echo "  make frontend-install        - Reinstall both frontend dependencies"
	@echo ""
	@echo "📝 Windows Users: Use 'npm run <command>' from package.json where applicable"
	@echo "   Example: npm run backend, npm run frontend:website, npm run frontend:mobile"

# Complete setup
setup:
	npm run setup

# Backend setup
backend-setup:
	@echo "🐍 Setting up backend..."
	npm run backend:setup
	@echo "✅ Backend setup complete!"

# Frontend setup (both website and mobile)
frontend-setup:
	npm run frontend:setup
	@echo "✅ Frontend setup complete (website + mobile)!"

# Website frontend setup
frontend-website-setup:
	@echo "🌐 Setting up website frontend..."
	npm run frontend:website:setup
	@echo "✅ Website frontend setup complete!"

# Mobile frontend setup
frontend-mobile-setup:
	@echo "📱 Setting up mobile frontend (Expo)..."
	npm run frontend:mobile:setup
	@echo "✅ Mobile frontend setup complete!"

# Run backend + website (default dev experience)
dev:
	@echo "🚀 Starting MediSaathi (backend + website)..."
	@make -j2 backend frontend-website

# Run backend only
backend:
	@echo "🐍 Starting backend server..."
	npm run backend

# Run website frontend only (Vite)
frontend-website:
	@echo "🌐 Starting website (Vite)..."
	npm run frontend:website

# Run mobile frontend only (Expo)
frontend-mobile:
	@echo "📱 Starting mobile (Expo)..."
	npm run frontend:mobile

# Alias: frontend = website (backward compatibility)
frontend: frontend-website

# Clean all dependencies and caches
clean:
	@echo "🧹 Cleaning project..."
	npm run clean
	@echo "✅ Project cleaned!"

# Reinstall backend dependencies
backend-install:
	@echo "🐍 Reinstalling backend dependencies..."
	npm run backend:install
	@echo "✅ Backend dependencies reinstalled!"

# Reinstall frontend dependencies (both)
frontend-install: frontend-website-setup frontend-mobile-setup
	@echo "✅ Frontend dependencies reinstalled!"

# Install (alias for setup)
install: setup
