@echo off
chcp 65001 >nul
title San Dau Tranh Bien - Phap Luat Dau Thau
echo ========================================================
echo   SAN DAU TRANH BIEN - PHAP LUAT DAU THAU (LOCAL SERVER)
echo ========================================================
echo.
echo Dang khoi dong he thong tai: http://localhost:3000
echo Trình duyet se tu dong mo sau 2 giay...
echo (Nhan Ctrl+C hoac dong cua so nay khi muon tat server)
echo.
start "" "http://localhost:3000"
"D:\UIT-HK7\.venv\Scripts\python.exe" "D:\UIT-HK7\LawGame\frontend-service\main.py"
pause

