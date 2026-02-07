#!/bin/bash

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Please run 'make setup' first."
    exit 1
fi

# Run uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 5050
