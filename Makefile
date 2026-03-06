# Frontend build + web klasörüne kopyala + Go build
.PHONY: build frontend go

build: frontend go

frontend:
	cd frontend && npm run build
	rm -rf internal/static/web/*
	cp -r frontend/dist/* internal/static/web/

go:
	go build -o server ./cmd/server

run: build
	./server
