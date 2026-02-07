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
setup: backend-setup frontend-setup
	@echo "✅ Setup complete!"
	@echo "   Website: make frontend-website"
	@echo "   Mobile:  make frontend-mobile"
	@echo "   Backend: make backend"

# Backend setup
backend-setup:
	@echo "🐍 Setting up backend..."
	@cd backend && \
	if [ ! -d "venv" ]; then \
		$(PYTHON) -m venv venv; \
	fi && \
	. venv/bin/activate && \
	pip install --upgrade pip && \
	pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org
	@echo "✅ Backend setup complete!"
	@echo "⚠️  Create backend/.env with Supabase (and other) credentials"

# Frontend setup (both website and mobile)
frontend-setup: frontend-website-setup frontend-mobile-setup
	@echo "✅ Frontend setup complete (website + mobile)!"

# Website frontend setup
frontend-website-setup:
	@echo "🌐 Setting up website frontend..."
	@cd frontend/website && npm install
	@echo "✅ Website frontend setup complete!"

# Mobile frontend setup
frontend-mobile-setup:
	@echo "📱 Setting up mobile frontend (Expo)..."
	@cd frontend/mobile && npm install
	@echo "✅ Mobile frontend setup complete!"

# Run backend + website (default dev experience)
dev:
	@echo "🚀 Starting MediSaathi (backend + website)..."
	@make -j2 backend frontend-website

# Run backend only
backend:
	@echo "🐍 Starting backend server..."
	@cd backend && \
	if [ ! -f .env ]; then \
		echo "❌ Error: .env file not found!"; \
		echo "Please create backend/.env with your credentials"; \
		exit 1; \
	fi && \
	. venv/bin/activate && \
	uvicorn app.main:app --reload --host 0.0.0.0 --port 5050

# Run website frontend only (Vite)
frontend-website:
	@echo "🌐 Starting website (Vite)..."
	@cd frontend/website && npm run dev

# Run mobile frontend only (Expo)
frontend-mobile:
	@echo "📱 Starting mobile (Expo)..."
	@echo "📱 Scan the QR code with Expo Go to run on device"
	@cd frontend/mobile && npx expo start --clear

# Alias: frontend = website (backward compatibility)
frontend: frontend-website

# Clean all dependencies and caches
clean:
	@echo "🧹 Cleaning project..."
	@rm -rf backend/venv
	@rm -rf backend/__pycache__
	@rm -rf backend/app/__pycache__
	@rm -rf backend/app/routers/__pycache__
	@rm -rf frontend/website/node_modules
	@rm -rf frontend/mobile/node_modules
	@rm -rf frontend/mobile/.expo
	@rm -rf frontend/package-lock.json
	@rm -rf frontend/website/package-lock.json
	@rm -rf frontend/mobile/package-lock.json
	@echo "✅ Project cleaned!"

# Reinstall backend dependencies
backend-install:
	@echo "🐍 Reinstalling backend dependencies..."
	@cd backend && \
	. venv/bin/activate && \
	pip install --upgrade pip && \
	pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org --force-reinstall
	@echo "✅ Backend dependencies reinstalled!"

# Reinstall frontend dependencies (both)
frontend-install: frontend-website-setup frontend-mobile-setup
	@echo "✅ Frontend dependencies reinstalled!"

# Install (alias for setup)
install: setup
