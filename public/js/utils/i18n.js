// 初始化i18next
export function initI18next() {
  // 获取语言选择器
  const languageSwitcher = document.getElementById('languageSwitcher');
  
  // 从localStorage获取保存的语言设置
  const savedLanguage = localStorage.getItem('language') || 'zh-CN';
  languageSwitcher.value = savedLanguage;
  
  // 初始化i18next
  i18next
    .use(i18nextHttpBackend)
    .init({
      lng: savedLanguage,
      fallbackLng: 'zh-CN',
      ns: ['admin'],
      defaultNS: 'admin',
      backend: {
        loadPath: '/api/translations/{{lng}}/{{ns}}'
      }
    }, function(err, t) {
      // 初始化完成后翻译页面
      translatePage();
    });

  // 绑定语言切换事件
  languageSwitcher.addEventListener('change', function() {
    const selectedLanguage = this.value;
    i18next.changeLanguage(selectedLanguage, () => {
      localStorage.setItem('language', selectedLanguage);
      translatePage(); // 重新翻译页面
    });
  });
}

// 翻译页面元素
export function translatePage() {
  // 翻译带有data-i18n属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = i18next.t(key);
    if (translation !== key) { // 只有当翻译存在时才更新
      element.textContent = translation;
    }
  });
}