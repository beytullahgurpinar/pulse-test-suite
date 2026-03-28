# Frontend build + web klasörüne kopyala + Go build
.PHONY: build frontend go mcp run

build: frontend go mcp

frontend:
	cd frontend && npm run build
	rm -rf internal/static/web/*
	cp -r frontend/dist/* internal/static/web/

go:
	go build -o server ./cmd/server

mcp:
	go build -o zotlo-mcp ./cmd/mcp

run: build
	./server
