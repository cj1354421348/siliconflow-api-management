// 显示toast通知
export function showToast(message, duration = 2000, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  
  if (isError) {
    toast.classList.add('toast-error');
  } else {
    toast.classList.remove('toast-error');
  }
  
  // 清除之前的定时器
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  // 设置自动关闭
  if (duration > 0) {
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
}