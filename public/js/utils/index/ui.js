// 展示toast通知
export function showToast(message, duration = 2000, isError = false) {
  // 创建toast元素
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast'; // 添加类名以应用CSS样式
    document.body.appendChild(toast);
  }
  
  // 使用i18next翻译消息（如果存在对应的键）
  const translatedMessage = i18next.t(message) !== message ? i18next.t(message) : message;
  toast.textContent = translatedMessage;
  toast.className = 'toast show'; // 添加show类以显示toast
  
  // 清除之前的定时器
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  // 设置自动消失
  toast.timeoutId = setTimeout(() => {
    toast.className = 'toast'; // 移除show类以隐藏toast
  }, duration);
}