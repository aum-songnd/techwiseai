### Tạo môi trường ảo
python -m venv rag-env
source rag-env/bin/activate.fish

### Cài thư viện 
python -m pip install -r requirements.txt

### Kết nối database
psql -h 127.0.0.1 -p 5432 -U regulation_user -d regulation_db -W
