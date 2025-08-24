const fetch = require('node-fetch');

// 转发请求到目标API
async function forwardRequest(targetUrl, method, headers, body, isStreamRequest) {
  console.log('转发请求到:', targetUrl);
  
  // 准备请求头，保留原始请求的所有头信息
  const requestHeaders = { ...headers };
  
  // 删除host头，避免请求转发问题
  delete requestHeaders.host;
  delete requestHeaders['content-length']; // 删除内容长度头，让fetch自动计算
  
  // 设置content-type(如果没有的话)
  if (!requestHeaders['content-type']) {
    requestHeaders['content-type'] = 'application/json';
  }
  
  // 发起请求
  const fetchOptions = {
    method: method,
    headers: requestHeaders,
    body: body
  };
  
  // 使用更强大的错误处理
  let response;
  try {
    const startTime = Date.now();
    response = await fetch(targetUrl, fetchOptions);
    const requestTime = Date.now() - startTime;
    console.log(`获得响应状态码: ${response.status}，耗时: ${requestTime}ms`);
    
    return response;
  } catch (fetchError) {
    console.error('Fetch请求失败:', fetchError.message);
    if (fetchError.cause) {
      console.error('错误原因:', fetchError.cause);
    }
    
    throw fetchError;
  }
}

// 处理流式响应
function handleStreamResponse(response, res, isStreamRequest) {
  const contentType = response.headers.get('content-type');
  console.log('响应内容类型:', contentType);
  
  // 设置响应状态码和头信息
  res.status(response.status);
  
  // 转发所有响应头
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  // 如果是流式响应，进行流式转发
  if (isStreamRequest || (contentType && (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')))) {
    console.log('检测到流式响应，开始流式传输');
    
    // 确保设置正确的响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 使用管道流式转发响应
    // 针对node-fetch v2的兼容处理
    if (response.body && typeof response.body.pipe === 'function') {
      // 如果body是可管道流的(node-fetch v2)
      console.log('使用管道流式传输');
      response.body.pipe(res);
      return true;
    } else if (response.body && typeof response.body.getReader === 'function') {
      // 如果body有getReader方法(fetch)
      console.log('使用getReader流式传输');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      async function streamResponse() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('流传输完成');
              res.end();
              break;
            }
            
            // 解码接收到的数据并转发
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        } catch (error) {
          console.error('流处理错误:', error);
          if (!res.headersSent) {
            res.status(500).json({
              code: 50000,
              message: "流处理错误: " + error.message,
              status: false
            });
          } else {
            res.end();
          }
        }
      }
      
      streamResponse();
      return true;
    } else {
      // 作为文本处理并分块发送
      console.log('使用文本分块传输');
      response.text().then(text => {
        // 按行分割
        const lines = text.split('\n');
        // 逐行发送
        for (const line of lines) {
          if (line.trim() !== '') {
            res.write(line + '\n');
          }
        }
        res.end();
      }).catch(error => {
        console.error('处理文本响应出错:', error);
        if (!res.headersSent) {
          res.status(500).json({
            code: 50000,
            message: "流处理错误: " + error.message,
            status: false
          });
        } else {
          res.end();
        }
      });
      return true;
    }
  }
  
  return false;
}

// 处理JSON响应
async function handleJsonResponse(response, res) {
  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    console.error('解析JSON响应失败:', jsonError);
    // 尝试读取原始文本
    const text = await response.text();
    
    if (text.trim().length === 0) {
      // 空响应，直接结束
      return res.end();
    }
    
    // 尝试作为文本返回
    res.setHeader('Content-Type', 'text/plain');
    return res.send(text);
  }
  
  return res.json(data);
}

module.exports = {
  forwardRequest,
  handleStreamResponse,
  handleJsonResponse
};