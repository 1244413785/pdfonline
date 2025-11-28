from flask import Flask, request, jsonify, send_file, send_from_directory, render_template_string
from flask_cors import CORS
import os
import tempfile
from pypdf import PdfReader, PdfWriter
from werkzeug.utils import secure_filename
import zipfile
import io
import webbrowser
import threading
import time

app = Flask(__name__, static_folder='.')
CORS(app)

# 配置
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_style_code(filename):
    """
    从文件名提取款号和码数
    文件名格式：abc-x-36.pdf 或 abc-x-36
    返回：(款号, 码数) 例如：('abc-x', '36')
    """
    # 移除扩展名
    name_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
    
    # 按最后一个 '-' 分割，获取款号和码数
    parts = name_without_ext.rsplit('-', 1)
    if len(parts) == 2:
        style_code = parts[0]  # 款号
        size_code = parts[1]   # 码数
        return style_code, size_code
    return None, None

# 读取HTML文件内容
def read_html_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f'<h1>错误：无法读取文件 {filename}</h1><p>{str(e)}</p>'

@app.route('/')
def index():
    """提供主页面"""
    html_content = read_html_file('index.html')
    return render_template_string(html_content)

@app.route('/style.css')
def style_css():
    """提供CSS文件"""
    return send_from_directory('.', 'style.css', mimetype='text/css')

@app.route('/script.js')
def script_js():
    """提供JavaScript文件"""
    return send_from_directory('.', 'script.js', mimetype='application/javascript')

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """上传PDF文件"""
    try:
        print('收到上传请求')
        print('请求方法:', request.method)
        print('Content-Type:', request.content_type)
        
        if 'files' not in request.files:
            print('错误: 请求中没有files字段')
            return jsonify({'error': '没有文件上传，请确保使用multipart/form-data格式'}), 400
        
        files = request.files.getlist('files')
        print(f'收到 {len(files)} 个文件')
        
        if len(files) == 0:
            return jsonify({'error': '没有选择文件'}), 400
        
        uploaded_files = []
        errors = []
        
        for idx, file in enumerate(files):
            print(f'处理文件 {idx + 1}: {file.filename if file else "None"}')
            
            if not file or not file.filename:
                print(f'文件 {idx + 1} 为空或没有文件名')
                continue
            
            if not allowed_file(file.filename):
                error_msg = f'文件 {file.filename} 不是PDF格式'
                print(error_msg)
                errors.append(error_msg)
                continue
            
            try:
                filename = secure_filename(file.filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                # 如果文件已存在，添加时间戳
                if os.path.exists(filepath):
                    name, ext = os.path.splitext(filename)
                    filename = f"{name}_{int(time.time())}{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                file.save(filepath)
                print(f'文件已保存: {filepath}')
                
                # 读取PDF页数并提取款号
                try:
                    reader = PdfReader(filepath)
                    page_count = len(reader.pages)
                    style_code, size_code = extract_style_code(filename)
                    
                    uploaded_files.append({
                        'filename': filename,
                        'pageCount': page_count,
                        'filepath': filepath,
                        'styleCode': style_code if style_code else '',
                        'sizeCode': size_code if size_code else ''
                    })
                    print(f'成功处理文件: {filename}, 页数: {page_count}, 款号: {style_code}, 码数: {size_code}')
                except Exception as e:
                    error_msg = f'读取PDF失败: {filename}, 错误: {str(e)}'
                    print(error_msg)
                    errors.append(error_msg)
                    # 删除已保存的文件
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    continue
                    
            except Exception as e:
                error_msg = f'保存文件失败: {file.filename}, 错误: {str(e)}'
                print(error_msg)
                errors.append(error_msg)
                continue
        
        if len(uploaded_files) == 0:
            error_message = '没有成功上传任何文件'
            if errors:
                error_message += '。错误: ' + '; '.join(errors)
            return jsonify({'error': error_message}), 400
        
        print(f'成功上传 {len(uploaded_files)} 个文件')
        result = {'files': uploaded_files}
        if errors:
            result['warnings'] = errors
        
        return jsonify(result)
        
    except Exception as e:
        print(f'上传处理异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/api/merge', methods=['POST'])
def merge_pdfs():
    """合并PDF文件"""
    try:
        data = request.json
        files_config = data.get('files', [])  # [{filename, ratios: [1,2,1], ...}]
        output_count = data.get('outputCount', 1)  # 生成多少份
        style_code = data.get('styleCode', '')  # 款号
        
        if not files_config:
            return jsonify({'error': '没有文件配置'}), 400
        
        # 创建临时目录存储合并后的文件
        temp_dir = tempfile.mkdtemp()
        output_files = []
        
        # 为每个文件创建读取器并跟踪已使用的页数
        file_readers = {}
        file_page_counters = {}
        
        for file_config in files_config:
            filename = file_config.get('filename')
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(filepath):
                file_readers[filename] = PdfReader(filepath)
                file_page_counters[filename] = 0  # 跟踪已使用的页数
        
        # 为每份输出生成一个PDF
        for output_idx in range(output_count):
            writer = PdfWriter()
            
            # 遍历每个文件配置
            for file_config in files_config:
                filename = file_config.get('filename')
                ratios = file_config.get('ratios', [1])  # 每份从该文件取多少页
                
                if filename not in file_readers:
                    continue
                
                reader = file_readers[filename]
                total_pages = len(reader.pages)
                current_counter = file_page_counters[filename]
                
                # 确定当前输出应该取多少页
                # 如果ratios是数组，使用第一个值（因为自动计算时每个文件只有一个比例值）
                if isinstance(ratios, list) and len(ratios) > 0:
                    pages_to_take = ratios[0]  # 使用第一个比例值
                else:
                    pages_to_take = ratios if isinstance(ratios, int) else 1
                
                # 从当前计数器位置开始取页
                for i in range(pages_to_take):
                    page_idx = current_counter + i
                    if page_idx < total_pages:
                        writer.add_page(reader.pages[page_idx])
                    else:
                        # 如果页数不够，停止取页
                        break
                
                # 更新计数器
                file_page_counters[filename] += pages_to_take
            
            # 保存合并后的PDF，命名为：箱1、箱2...
            output_filename = f'箱{output_idx + 1}.pdf'
            output_path = os.path.join(temp_dir, output_filename)
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            output_files.append((output_path, output_filename))
        
        # 如果只有一份，直接返回单个PDF
        if len(output_files) == 1:
            return send_file(
                output_files[0][0],
                mimetype='application/pdf',
                as_attachment=True,
                download_name=output_files[0][1]
            )
        
        # 多份文件，打包成ZIP，使用款号命名
        zip_filename = f'{style_code}.zip' if style_code else 'merged_pdfs.zip'
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for output_file, output_filename in output_files:
                zip_file.write(output_file, output_filename)
        
        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )
        
    except Exception as e:
        return jsonify({'error': f'合并失败: {str(e)}'}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    """清理上传的文件"""
    try:
        print('收到清空文件请求')
        if not os.path.exists(UPLOAD_FOLDER):
            print('上传文件夹不存在，创建它')
            os.makedirs(UPLOAD_FOLDER)
            return jsonify({'message': '清理完成（文件夹为空）'})
        
        deleted_count = 0
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                    deleted_count += 1
                    print(f'已删除文件: {filename}')
                except Exception as e:
                    print(f'删除文件失败: {filename}, 错误: {str(e)}')
        
        print(f'清理完成，共删除 {deleted_count} 个文件')
        return jsonify({'message': f'清理完成，共删除 {deleted_count} 个文件'})
    except Exception as e:
        print(f'清理文件异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'清理失败: {str(e)}'}), 500

LISTEN_HOST = os.environ.get('APP_HOST', '0.0.0.0')
LISTEN_PORT = int(os.environ.get('APP_PORT', 5000))

if __name__ == '__main__':
    print('=' * 50)
    print('PDF智能合并工具服务器')
    print('=' * 50)
    print('服务器正在启动...')
    if LISTEN_HOST == '0.0.0.0':
        print(f'请在浏览器访问: http://<服务器IP>:{LISTEN_PORT}')
    else:
        print(f'访问地址: http://{LISTEN_HOST}:{LISTEN_PORT}')
    print('按 Ctrl+C 停止服务器（运行于生产环境建议使用 systemd 或 gunicorn）')
    print('=' * 50)
    
    try:
        app.run(
            debug=False,
            port=LISTEN_PORT,
            host=LISTEN_HOST,
            use_reloader=False
        )
    except OSError as e:
        if 'Address already in use' in str(e) or '地址已在使用' in str(e):
            print('\n错误：端口5000已被占用！')
            print('请关闭占用该端口的程序，或修改app.py中的端口号')
        else:
            print(f'\n错误：{str(e)}')

