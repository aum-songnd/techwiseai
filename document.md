// tạo venv
python3 -m venv ai-data/.venv

// khởi động môi trường ảo venv
source ai-data/.venv/bin/activate

// mở postgress db
docker exec -it regulation-postgres \
  psql -U regulation_user -d regulation_db

// complie backend
./mvnw clean compile

// run backend 
mvn spring-boot:run

// chạy fastapi
uvicorn app.main:app \
  --app-dir ai-service \
  --host 0.0.0.0 \
  --port 8000