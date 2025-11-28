#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试服务器连接
"""
import requests
import sys

def test_server():
    """测试服务器是否正常运行"""
    base_url = 'http://localhost:5000'
    
    print('=' * 50)
    print('测试PDF合并工具服务器')
    print('=' * 50)
    print()
    
    try:
        # 测试主页
        print('1. 测试主页连接...', end=' ')
        response = requests.get(base_url, timeout=5)
        if response.status_code == 200:
            print('✓ 成功')
        else:
            print(f'✗ 失败 (状态码: {response.status_code})')
            return False
        
        # 测试CSS文件
        print('2. 测试CSS文件...', end=' ')
        response = requests.get(f'{base_url}/style.css', timeout=5)
        if response.status_code == 200:
            print('✓ 成功')
        else:
            print(f'✗ 失败 (状态码: {response.status_code})')
        
        # 测试JS文件
        print('3. 测试JavaScript文件...', end=' ')
        response = requests.get(f'{base_url}/script.js', timeout=5)
        if response.status_code == 200:
            print('✓ 成功')
        else:
            print(f'✗ 失败 (状态码: {response.status_code})')
        
        # 测试API端点
        print('4. 测试API端点...', end=' ')
        response = requests.post(f'{base_url}/api/upload', timeout=5)
        # 400是预期的，因为没有上传文件
        if response.status_code in [400, 405]:
            print('✓ 成功 (端点存在)')
        else:
            print(f'? 未知响应 (状态码: {response.status_code})')
        
        print()
        print('=' * 50)
        print('✓ 服务器运行正常！')
        print('=' * 50)
        print()
        print(f'请在浏览器中访问: {base_url}')
        return True
        
    except requests.exceptions.ConnectionError:
        print('✗ 无法连接到服务器！')
        print()
        print('可能的原因:')
        print('  1. 服务器未启动')
        print('  2. 端口5000被占用')
        print('  3. 防火墙阻止了连接')
        print()
        print('解决方案:')
        print('  1. 运行 start.bat 启动服务器')
        print('  2. 或运行: python app.py')
        return False
    except Exception as e:
        print(f'✗ 测试失败: {str(e)}')
        return False

if __name__ == '__main__':
    try:
        success = test_server()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print('\n\n测试已取消')
        sys.exit(1)

