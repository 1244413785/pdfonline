@echo off
chcp 65001 >nul
title PDF智能合并工具服务器
echo ========================================
echo PDF智能合并工具服务器
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python！
    echo 请先安装Python 3.8或更高版本
    echo.
    pause
    exit /b 1
)

echo [信息] 正在检查依赖包...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [警告] 检测到缺少依赖包，正在安装...
    echo.
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [错误] 依赖安装失败！
        echo 请手动运行: pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
)

echo [信息] 正在启动服务器...
echo [提示] 服务器启动后会自动打开浏览器
echo [提示] 如果没有自动打开，请手动访问: http://localhost:5000
echo [提示] 按 Ctrl+C 可停止服务器
echo [提示] 若服务器意外退出，将自动尝试重启
echo.
echo ========================================
echo.

:START_SERVER
python app.py
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
    echo [提示] 服务器已退出 (代码 %EXITCODE%)。
) else (
    echo [错误] 服务器异常退出，错误码: %EXITCODE%
)
echo.
echo [提示] 5 秒后自动尝试重新启动。若不想重启，请按 Ctrl+C 终止此窗口。
timeout /t 5 >nul
echo.
echo [信息] 正在重新启动服务器...
echo.
goto START_SERVER
