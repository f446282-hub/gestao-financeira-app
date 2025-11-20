
@echo off
echo ===============================
echo Iniciando backend (API)...
echo ===============================
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
pause
