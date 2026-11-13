# Start all 3 LawGame microservices using D:\UIT-HK7\.venv
$VenvPython = "D:\UIT-HK7\.venv\Scripts\python.exe"
$RootDir = "D:\UIT-HK7\LawGame"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KHỞI ĐỘNG HỆ THỐNG ĐẤU TRƯỜNG PHÁP LUẬT ĐẤU THẦU (VENV)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process -FilePath $VenvPython -ArgumentList "$RootDir\ai-grading-service\main.py" -WorkingDirectory "$RootDir\ai-grading-service"
Write-Host "[1/3] AI Grading Service started on http://localhost:4002" -ForegroundColor Green

Start-Process -FilePath $VenvPython -ArgumentList "$RootDir\game-engine-service\main.py" -WorkingDirectory "$RootDir\game-engine-service"
Write-Host "[2/3] Game Engine Service started on http://localhost:4001" -ForegroundColor Green

Start-Process -FilePath $VenvPython -ArgumentList "$RootDir\frontend-service\main.py" -WorkingDirectory "$RootDir\frontend-service"
Write-Host "[3/3] Frontend Service started on http://localhost:3000" -ForegroundColor Green

Write-Host "`nMở trình duyệt tại: http://localhost:3000" -ForegroundColor Yellow

