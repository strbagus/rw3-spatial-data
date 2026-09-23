dev:
	npm run dev

deploy:
	git pull
	docker compose up -d --build
