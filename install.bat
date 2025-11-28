@echo off
chcp 65001 >nul
echo ========================================
echo PDF合并工具 - 依赖安装
echo ========================================
echo.
echo 正在安装Python依赖包...
echo.

python -m pip install --upgrade pip
python -m pip install Flask==3.0.0
python -m pip install flask-cors==4.0.0
python -m pip install pypdf==3.17.0
python -m pip install Werkzeug==3.0.1

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 按任意键启动服务器...
pause >nul

python app.py

