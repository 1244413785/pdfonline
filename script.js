// 自动检测API基础路径
let API_BASE;
if (window.location.protocol === 'file:') {
    // 如果直接打开HTML文件，使用完整URL
    API_BASE = 'http://localhost:5000/api';
} else {
    // 如果通过服务器访问，使用相对路径
    API_BASE = '/api';
}

console.log('API_BASE设置为:', API_BASE);
console.log('当前页面URL:', window.location.href);
console.log('当前协议:', window.location.protocol);
console.log('当前主机:', window.location.host);

console.log('API_BASE设置为:', API_BASE);
console.log('当前页面URL:', window.location.href);
console.log('当前协议:', window.location.protocol);
console.log('当前主机:', window.location.host);

// 测试服务器连接
async function testConnection() {
    // 延迟测试，确保DOM已初始化
    setTimeout(async () => {
        try {
            const response = await fetch(API_BASE.replace('/api', ''));
            if (!response.ok && window.location.protocol === 'file:') {
                console.warn('无法连接到服务器，请确保服务器已启动');
                showStatus('无法连接到服务器！请确保服务器已启动在 http://localhost:5000', 'error');
            }
        } catch (error) {
            if (window.location.protocol === 'file:') {
                console.warn('服务器连接失败:', error);
                showStatus('无法连接到服务器！请确保服务器已启动在 http://localhost:5000', 'error');
            }
        }
    }, 500);
}

// 页面加载完成后初始化
function onPageLoad() {
    console.log('=== 开始初始化页面 ===');
    console.log('当前API_BASE:', API_BASE);
    
    // 初始化DOM
    if (!initDOM()) {
        console.error('DOM初始化失败');
        alert('页面初始化失败，请刷新页面重试');
        return;
    }
    
    console.log('DOM初始化成功');
    console.log('uploadArea:', uploadArea);
    console.log('fileInput:', fileInput);
    console.log('fileInput类型:', typeof fileInput);
    console.log('fileInput元素:', fileInput ? fileInput.constructor.name : 'null');
    
    // 绑定事件
    console.log('开始绑定事件...');
    bindFileInputEvents();
    bindDragEvents();
    
    // 测试服务器连接
    testConnection();
    
    // 绑定其他事件
    bindOtherEvents();
    
    console.log('页面初始化完成');
}

// 绑定其他事件
function bindOtherEvents() {
    // 监听生成份数变化，自动重新计算比例
    if (outputCountInput) {
        outputCountInput.addEventListener('change', () => {
            if (uploadedFiles.length > 0) {
                autoCalculateRatios();
                renderFilesList();
            }
        });
    }
    
    // 合并按钮
    if (mergeBtn) {
        mergeBtn.addEventListener('click', handleMerge);
    }
    
    // 清空按钮
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', handleCleanup);
    }
}

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageLoad);
} else {
    onPageLoad();
}

let uploadedFiles = [];

// DOM元素 - 等待页面加载完成
let uploadArea, fileInput, configSection, actionSection, filesList;
let outputCountInput, mergeBtn, cleanupBtn, statusMessage;
let currentStyleCode = null; // 当前允许的款号

// 初始化DOM元素和事件监听
function initDOM() {
    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('fileInput');
    configSection = document.getElementById('configSection');
    actionSection = document.getElementById('actionSection');
    filesList = document.getElementById('filesList');
    outputCountInput = document.getElementById('outputCount');
    mergeBtn = document.getElementById('mergeBtn');
    cleanupBtn = document.getElementById('cleanupBtn');
    statusMessage = document.getElementById('statusMessage');
    
    // 检查元素是否存在
    if (!uploadArea) {
        console.error('无法找到上传区域元素 (uploadArea)');
        return false;
    }
    
    if (!fileInput) {
        console.error('无法找到文件输入元素 (fileInput)');
        return false;
    }
    
    // 最简单的样式设置 - 初始版本
    uploadArea.style.position = 'relative';
    uploadArea.style.cursor = 'pointer';
    
    fileInput.style.position = 'absolute';
    fileInput.style.top = '0';
    fileInput.style.left = '0';
    fileInput.style.width = '100%';
    fileInput.style.height = '100%';
    fileInput.style.opacity = '0';
    fileInput.style.cursor = 'pointer';
    fileInput.style.zIndex = '10';
    
    // 防止占位符阻止点击
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    if (placeholder) {
        placeholder.style.pointerEvents = 'none';
    }
    
    // 最简单的点击事件 - 初始版本
    uploadArea.onclick = function(e) {
        console.log('上传区域被点击');
        if (fileInput) {
            fileInput.click();
        }
    };
    
    console.log('DOM元素初始化完成');
    return true;
}

// 文件选择事件 - 最简单直接的实现
function bindFileInputEvents() {
    if (!fileInput) {
        console.error('fileInput 不存在，无法绑定事件');
        return;
    }
    
    console.log('绑定文件输入change事件 - 初始版本');
    
    // 最简单的事件绑定
    fileInput.onchange = function(e) {
        console.log('=== 文件选择事件触发 ===');
        console.log('事件对象:', e);
        console.log('目标元素:', e.target);
        
        const files = e.target.files;
        console.log('文件列表:', files);
        console.log('文件数量:', files ? files.length : 0);
        
        if (!files || files.length === 0) {
            console.warn('没有选择文件');
            alert('请选择PDF文件');
            return;
        }
        
        // 显示选择的文件
        console.log(`选择了 ${files.length} 个文件:`);
        for (let i = 0; i < files.length; i++) {
            console.log(`文件 ${i + 1}: ${files[i].name} (${files[i].size} bytes)`);
        }
        
        // 直接调用处理函数
        console.log('开始处理文件...');
        handleFiles(files);
    };
    
    console.log('文件输入事件绑定完成');
}

// 拖拽事件 - 在初始化后绑定
function bindDragEvents() {
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    });
}

// 处理文件上传
async function handleFiles(files) {
    console.log('=== handleFiles 函数被调用 ===');
    console.log('文件数量:', files.length);
    console.log('文件列表:', Array.from(files).map(f => f.name));
    
    // 如果列表为空，确保款号也重置（防止清空后残留状态）
    if (uploadedFiles.length === 0) {
        currentStyleCode = null;
        console.log('文件列表为空，重置款号为null');
    }

    if (!files || files.length === 0) {
        console.log('没有选择文件，退出');
        return;
    }
    
    // 验证API_BASE是否正确
    if (!API_BASE) {
        console.error('API_BASE未设置！');
        alert('错误：API地址未设置，请刷新页面重试');
        showStatus('错误：API地址未设置', 'error');
        if (mergeBtn) mergeBtn.disabled = false;
        return;
    }
    
    console.log('准备上传，当前状态:');
    console.log('  - API_BASE:', API_BASE);
    console.log('  - uploadedFiles数量:', uploadedFiles.length);
    console.log('  - currentStyleCode:', currentStyleCode);
    
    // 验证文件类型
    const invalidFiles = Array.from(files).filter(f => !f.name.toLowerCase().endsWith('.pdf'));
    if (invalidFiles.length > 0) {
        const invalidNames = invalidFiles.map(f => f.name).join(', ');
        console.warn('发现非PDF文件:', invalidNames);
        showStatus(`警告：以下文件不是PDF格式: ${invalidNames}`, 'error');
    }
    
    console.log('开始上传文件，文件数量:', files.length);
    showStatus('正在上传文件...', 'info');
    if (mergeBtn) {
        mergeBtn.disabled = true;
    }
    
    const formData = new FormData();
    for (let file of files) {
        console.log('添加文件到FormData:', file.name, file.type, file.size);
        formData.append('files', file);
    }
    
    try {
        console.log('=== 开始上传 ===');
        console.log('API地址:', `${API_BASE}/upload`);
        console.log('文件数量:', files.length);
        console.log('FormData内容:');
        for (let pair of formData.entries()) {
            if (pair[1] instanceof File) {
                console.log('  ', pair[0], ':', `${pair[1].name} (${pair[1].size} bytes, ${pair[1].type})`);
            } else {
                console.log('  ', pair[0], ':', pair[1]);
            }
        }
        
        let response;
        try {
            response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
                // 注意：不要手动设置Content-Type，让浏览器自动设置multipart/form-data
            });
        } catch (fetchError) {
            console.error('Fetch请求失败:', fetchError);
            const errorMsg = fetchError.message || '网络请求失败';
            
            // 检查是否是连接问题
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
                const detailedMsg = `无法连接到服务器！\n\n可能的原因：\n1. 服务器未启动\n2. 服务器地址错误\n3. 网络连接问题\n\n当前API地址: ${API_BASE}/upload\n\n请确保服务器正在运行在 http://localhost:5000`;
                alert(`上传失败: ${detailedMsg}`);
                showStatus('无法连接到服务器，请检查服务器是否运行', 'error');
            } else {
                alert(`上传失败: ${errorMsg}`);
                showStatus(`上传失败: ${errorMsg}`, 'error');
            }
            
            if (mergeBtn) mergeBtn.disabled = false;
            if (fileInput) fileInput.value = '';
            return;
        }
        
        console.log('响应状态:', response.status, response.statusText);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        // 读取响应文本
        const responseText = await response.text();
        console.log('响应内容:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('解析JSON失败:', e);
            const errorMsg = `服务器返回格式错误 (状态: ${response.status})`;
            alert(`上传失败: ${errorMsg}\n\n响应内容:\n${responseText.substring(0, 200)}`);
            showStatus(`上传失败: ${errorMsg}`, 'error');
            if (mergeBtn) mergeBtn.disabled = false;
            return;
        }
        
        if (!response.ok) {
            const errorMsg = data.error || data.message || `HTTP ${response.status} ${response.statusText}`;
            console.error('上传失败:', errorMsg);
            alert(`上传失败: ${errorMsg}`);
            showStatus(`上传失败: ${errorMsg}`, 'error');
            if (mergeBtn) mergeBtn.disabled = false;
            return;
        }
        
        console.log('上传成功，返回数据:', data);
        
        if (!data.files || data.files.length === 0) {
            const errorMsg = data.error || '没有返回文件信息';
            alert(`上传失败: ${errorMsg}`);
            showStatus(`上传失败: ${errorMsg}`, 'error');
            if (mergeBtn) mergeBtn.disabled = false;
            return;
        }
        
        // 显示警告（如果有）
        if (data.warnings && data.warnings.length > 0) {
            console.warn('上传警告:', data.warnings);
            alert(`上传成功，但有警告:\n${data.warnings.join('\n')}`);
        }
        
        console.log(`成功上传 ${data.files.length} 个文件`);
        
        // 检查款号一致性 - 如果已有文件，新文件必须与已有文件款号一致
        const newStyleCodes = data.files.map(f => f.styleCode).filter(code => code);
        const newUniqueStyleCodes = [...new Set(newStyleCodes)];

        if (currentStyleCode) {
            // 只能上传与当前款号一致的文件
            if (newUniqueStyleCodes.some(code => code && code !== currentStyleCode)) {
                alert(`错误：只能上传款号为 ${currentStyleCode} 的文件！`);
                showStatus(`上传失败：只能上传款号为 ${currentStyleCode} 的文件`, 'error');
                if (mergeBtn) mergeBtn.disabled = false;
                if (fileInput) fileInput.value = '';
                return;
            }
        } else {
            // 尚未设置款号，若新文件含款号且只有一个，则记录
            if (newUniqueStyleCodes.length === 1) {
                currentStyleCode = newUniqueStyleCodes[0];
                console.log('设置当前款号为:', currentStyleCode);
            } else if (newUniqueStyleCodes.length > 1) {
                alert(`错误：上传的文件包含多个款号！\n款号：${newUniqueStyleCodes.join('、')}\n\n只能上传相同款号的文件！`);
                showStatus(`上传失败: 包含多个款号`, 'error');
                if (mergeBtn) mergeBtn.disabled = false;
                if (fileInput) fileInput.value = '';
                return;
            }
        }
        
        // 为每个文件添加默认比例配置
        data.files.forEach(file => {
            file.ratios = [1];
        });
        
        uploadedFiles.push(...data.files);
        console.log('已上传文件总数:', uploadedFiles.length);
        
        // 自动计算比例和生成份数
        calculateOptimalOutputCount();
        autoCalculateRatios();
        
        // 渲染文件列表
        renderFilesList();
        
        showStatus(`成功上传 ${data.files.length} 个文件`, 'success');
        
        // 清空文件输入
        if (fileInput) {
            fileInput.value = '';
        }
    } catch (error) {
        console.error('上传错误:', error);
        console.error('错误类型:', error.constructor.name);
        console.error('错误堆栈:', error.stack);
        
        let errorMsg = error.message || '未知错误';
        
        // 处理不同类型的错误
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch')) {
            errorMsg = `无法连接到服务器！\n\n请检查：\n1. 服务器是否正在运行（http://localhost:5000）\n2. 服务器地址是否正确\n3. 网络连接是否正常\n\n当前API地址: ${API_BASE}/upload\n\n提示：请运行 start.bat 启动服务器`;
        }
        
        alert(`上传失败: ${errorMsg}`);
        showStatus(`上传失败: ${error.message}`, 'error');
        if (fileInput) fileInput.value = '';
    } finally {
        if (mergeBtn) mergeBtn.disabled = false;
        console.log('=== handleFiles 完成 ===');
    }
}

// 计算最大公约数（GCD）
function calculateGCD(numbers) {
    if (!numbers || numbers.length === 0) return 1;
    if (numbers.length === 1) return numbers[0];

    const gcdTwo = (a, b) => {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    };

    return numbers.reduce((acc, curr) => gcdTwo(acc, curr));
}

// 计算最优生成份数（所有文件页数的最大公约数）
function calculateOptimalOutputCount() {
    if (!outputCountInput || uploadedFiles.length === 0) return;

    const pageCounts = uploadedFiles.map(f => f.pageCount).filter(count => count > 0);
    if (pageCounts.length === 0) return;

    const gcdValue = calculateGCD(pageCounts);

    console.log('文件页数:', pageCounts);
    console.log('计算的最大公约数:', gcdValue);

    if (gcdValue > 0) {
        outputCountInput.value = gcdValue;
        console.log('已设置生成份数为:', gcdValue);
    }
}

// 自动计算比例
function autoCalculateRatios() {
    const outputCount = parseInt(outputCountInput.value) || 1;
    if (outputCount <= 0 || uploadedFiles.length === 0) return;
    
    uploadedFiles.forEach((file) => {
        // 计算每份应该取多少页
        const pagesPerOutput = file.pageCount / outputCount;
        
        // 如果是整数，直接使用
        if (Number.isInteger(pagesPerOutput)) {
            file.ratios = [pagesPerOutput];
        } else {
            // 如果不是整数，使用最接近的整数
            const rounded = Math.round(pagesPerOutput);
            file.ratios = [rounded];
        }
    });
}

// 验证比例是否合理
function validateRatios() {
    const outputCount = parseInt(outputCountInput.value) || 1;
    if (outputCount <= 0) {
        return { valid: false, message: '生成份数必须大于0' };
    }
    
    const issues = [];
    const warnings = [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const ratio = file.ratios[0] || 1; // 使用第一个比例值
        const totalPagesNeeded = ratio * outputCount;
        
        // 检查比例总和是否超过总页数
        if (totalPagesNeeded > file.pageCount) {
            issues.push(`${file.filename}: 需要的页数(${totalPagesNeeded})超过总页数(${file.pageCount})`);
        }
        
        // 检查比例是否为整数
        const pagesPerOutput = file.pageCount / outputCount;
        if (!Number.isInteger(pagesPerOutput)) {
            const rounded = Math.round(pagesPerOutput);
            const actual = pagesPerOutput.toFixed(2);
            warnings.push(`${file.filename}: 页数(${file.pageCount}) ÷ 份数(${outputCount}) = ${actual}，不是整数！当前设置为每份 ${ratio} 页`);
        }
    }
    
    // 检查款号一致性
    const styleCodes = uploadedFiles.map(f => f.styleCode).filter(code => code);
    const uniqueStyleCodes = [...new Set(styleCodes)];
    if (uniqueStyleCodes.length > 1) {
        issues.push(`款号不一致：检测到 ${uniqueStyleCodes.length} 个不同的款号 (${uniqueStyleCodes.join('、')})`);
    }
    
    // 如果有严重问题，阻止合并
    if (issues.length > 0) {
        return { 
            valid: false, 
            message: issues.join('\n')
        };
    }
    
    // 如果有警告（非整数比例），提示用户确认
    if (warnings.length > 0) {
        const confirmMessage = `警告：检测到以下文件的页数无法被份数整除：\n\n${warnings.join('\n')}\n\n是否继续合并？`;
        return {
            valid: 'confirm',
            message: confirmMessage
        };
    }
    
    return { valid: true };
}

// 渲染文件列表
function renderFilesList() {
    console.log('renderFilesList 被调用，文件数量:', uploadedFiles.length);
    console.log('configSection:', configSection);
    console.log('actionSection:', actionSection);
    console.log('filesList:', filesList);
    
    if (!configSection || !actionSection || !filesList) {
        console.error('DOM元素未找到，无法渲染文件列表');
        return;
    }
    
    if (uploadedFiles.length === 0) {
        console.log('没有文件，隐藏配置区域');
        configSection.style.display = 'none';
        actionSection.style.display = 'none';
        return;
    }
    
    console.log('显示配置区域，渲染文件列表');
    configSection.style.display = 'block';
    actionSection.style.display = 'block';
    
    const html = uploadedFiles.map((file, fileIndex) => {
        const styleInfo = file.styleCode ? `<span class="style-code">款号: ${file.styleCode}</span>` : '';
        const sizeInfo = file.sizeCode ? `<span class="size-code">码数: ${file.sizeCode}</span>` : '';
        
        const ratio = file.ratios[0] || 1;
        
        return `
            <div class="file-item">
                <div class="file-header">
                    <div class="file-info">
                        <span class="file-name">${file.filename}</span>
                        ${styleInfo ? `<div class="file-meta">${styleInfo} ${sizeInfo}</div>` : ''}
                    </div>
                    <span class="file-pages">共 ${file.pageCount} 页</span>
                    <button class="remove-btn" onclick="removeFile(${fileIndex})">删除</button>
                </div>
                <div class="ratios-container">
                    <div class="ratio-item">
                        <input type="number" 
                               min="1" 
                               value="${ratio}" 
                               class="ratio-input"
                               data-file-index="${fileIndex}"
                               data-ratio-index="0">
                        <label>页/份</label>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('生成的HTML长度:', html.length);
    filesList.innerHTML = html;
    console.log('HTML已插入到filesList');
    
    // 绑定比例输入事件
    const ratioInputs = document.querySelectorAll('.ratio-input');
    console.log('找到比例输入框数量:', ratioInputs.length);
    ratioInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const fileIndex = parseInt(e.target.dataset.fileIndex);
            const ratioIndex = parseInt(e.target.dataset.ratioIndex);
            uploadedFiles[fileIndex].ratios[ratioIndex] = parseInt(e.target.value) || 1;
        });
    });
    
    console.log('文件列表渲染完成');
}

// 比例相关函数已移除，现在每个文件只有一个比例值

// 删除文件
function removeFile(fileIndex) {
    uploadedFiles.splice(fileIndex, 1);

    if (uploadedFiles.length === 0) {
        currentStyleCode = null;
        if (outputCountInput) outputCountInput.value = 1;
    } else {
        calculateOptimalOutputCount();
        autoCalculateRatios();
    }

    renderFilesList();
}

// 合并PDF
async function handleMerge() {
    if (uploadedFiles.length === 0) {
        showStatus('请先上传文件', 'error');
        return;
    }
    
    const outputCount = parseInt(outputCountInput.value) || 1;
    if (outputCount < 1) {
        showStatus('生成份数必须大于0', 'error');
        return;
    }
    
    // 验证比例和款号
    const validation = validateRatios();
    if (validation.valid === false) {
        alert(`错误：检测到以下问题：\n\n${validation.message}\n\n请检查后重试！`);
        showStatus('验证失败，请检查配置', 'error');
        return;
    }
    
    // 如果需要确认（非整数比例警告）
    if (validation.valid === 'confirm') {
        const confirmed = confirm(validation.message);
        if (!confirmed) {
            showStatus('已取消合并', 'info');
            return;
        }
    }
    
    // 获取款号（取第一个文件的款号）
    const styleCode = uploadedFiles[0]?.styleCode || '';
    
    showStatus('正在合并PDF，请稍候...', 'info');
    mergeBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/merge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: uploadedFiles.map(file => ({
                    filename: file.filename,
                    ratios: file.ratios
                })),
                outputCount: outputCount,
                styleCode: styleCode
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // 根据响应头或默认命名
            const contentDisposition = response.headers.get('Content-Disposition');
            let downloadName = outputCount > 1 ? (styleCode ? `${styleCode}.zip` : 'merged_pdfs.zip') : (styleCode ? `${styleCode}_箱1.pdf` : 'merged.pdf');
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch) {
                    downloadName = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showStatus(`成功生成 ${outputCount} 份合并文件！`, 'success');
        } else {
            const data = await response.json();
            showStatus(`合并失败: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`合并失败: ${error.message}`, 'error');
    } finally {
        if (mergeBtn) {
            mergeBtn.disabled = false;
        }
    }
}

// 清空文件
async function handleCleanup() {
    if (confirm('确定要清空所有文件吗？')) {
        try {
            console.log('开始清空文件...');
            console.log('清空API地址:', `${API_BASE}/cleanup`);
            
            let response;
            try {
                response = await fetch(`${API_BASE}/cleanup`, {
                    method: 'POST'
                });
            } catch (fetchError) {
                console.warn('清空请求失败（可能是服务器未运行）:', fetchError);
                // 即使请求失败，也清空前端状态
                uploadedFiles = [];
                currentStyleCode = null;
                if (outputCountInput) outputCountInput.value = '1';
                renderFilesList();
                showStatus('已清空前端文件列表', 'success');
                return;
            }
            
            console.log('清空响应状态:', response.status);
            
            if (response.ok) {
                const result = await response.json().catch(() => ({}));
                console.log('服务器清空成功:', result);
            } else {
                const errorData = await response.json().catch(() => ({ error: '清空失败' }));
                console.warn('服务器清空失败:', errorData);
            }
            
            // 无论服务器响应如何，都清空前端状态
            uploadedFiles = [];
            currentStyleCode = null;
            if (outputCountInput) outputCountInput.value = '1';
            renderFilesList();
            showStatus('已清空所有文件', 'success');
            
        } catch (error) {
            console.error('清空文件错误:', error);
            // 即使出错，也清空前端列表
            uploadedFiles = [];
            currentStyleCode = null;
            if (outputCountInput) outputCountInput.value = '1';
            renderFilesList();
            showStatus('已清空前端文件列表', 'success');
        }
    }
}

// 显示状态消息
function showStatus(message, type) {
    if (!statusMessage) {
        console.log(`[${type}] ${message}`);
        return;
    }
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        if (type !== 'info') {
            statusMessage.style.display = 'none';
        }
    }, 5000);
}

