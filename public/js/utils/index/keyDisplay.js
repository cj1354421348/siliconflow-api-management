import { loadTokenFromStorage } from './auth.js';
import { showToast } from './ui.js';

let allKeys = [];
let currentPage = 1;
let keysPerPage = 12;
let guestToken = null;

// Load keys list
export async function loadKeys() {
  try {
    console.log('Start loading keys...');
    const headers = {};
    const storedToken = loadTokenFromStorage();
    console.log('Stored token:', storedToken);
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    
    console.log('Sending request to /api/keys...');
    const response = await fetch('/api/keys', { headers });
    console.log('Received response:', response.status);
    const data = await response.json();
    console.log('Parsed data:', data);
    
    if (data.success) {
      allKeys = data.data;
      console.log('Received keys:', allKeys);
      
      // Show control panel and statistics
      document.getElementById('copyControls').style.display = 'flex';
      document.getElementById('pagination').style.display = 'flex';
      document.getElementById('stats').style.display = 'flex';
      document.getElementById('logoutBtn').style.display = 'block';
      
      // Update statistics
      updateStats();
      
      // Display current page keys
      displayCurrentPage();
    } else {
      console.log('Failed to load keys:', data.message);
      showToast(data.message || 'Load failed', 3000);
    }
  } catch (error) {
    console.error('Failed to load keys list:', error);
    showToast('toasts.loadFailed', 3000);
  }
}

// Update statistics
export function updateStats() {
  console.log('Updating statistics...');
  const totalKeys = allKeys.length;
  const validKeys = allKeys.filter(key => key.isValid !== false && parseFloat(key.balance || 0) > 0).length;
  const totalBalance = allKeys.reduce((sum, key) => sum + parseFloat(key.balance || 0), 0).toFixed(2);
  
  document.getElementById('totalKeys').textContent = totalKeys;
  document.getElementById('validKeys').textContent = validKeys;
  document.getElementById('totalBalance').textContent = `¥${totalBalance}`;
}

// Display current page keys
export function displayCurrentPage() {
  console.log('Displaying current page keys...');
  const startIndex = (currentPage - 1) * keysPerPage;
  const endIndex = Math.min(startIndex + keysPerPage, allKeys.length);
  
  const keysContainer = document.getElementById('keysContainer');
  keysContainer.innerHTML = '';
  
  // First sort by balance from high to low
  let keysToDisplay = [...allKeys];
  keysToDisplay.sort((a, b) => {
    // If key is invalid or balance is zero, put it at the end
    const balanceA = (!a.isValid || parseFloat(a.balance || 0) <= 0) ? -1 : parseFloat(a.balance || 0);
    const balanceB = (!b.isValid || parseFloat(b.balance || 0) <= 0) ? -1 : parseFloat(b.balance || 0);
    return balanceB - balanceA; // Descending order
  });
  
  // Use sorted array to get current page keys
  keysToDisplay = keysToDisplay.slice(startIndex, endIndex);
  console.log('Keys to display:', keysToDisplay);
  
  // Display each key
  keysToDisplay.forEach(key => {
    const keyElement = document.createElement('div');
    keyElement.className = 'key-card';
    
    // Check if key is valid
    const isValid = key.isValid && parseFloat(key.balance || 0) > 0;
    
    // Calculate balance color class
    let balanceClass = 'balance-zero';
    const balance = parseFloat(key.balance || 0);
    
    if (!isValid) {
      balanceClass = 'balance-invalid';
    } else if (balance > 1000) {
      balanceClass = 'balance-ultrahigh';
    } else if (balance >= 500) {
      balanceClass = 'balance-veryhigh';
    } else if (balance >= 100) {
      balanceClass = 'balance-high';
    } else if (balance >= 50) {
      balanceClass = 'balance-mediumhigh';
    } else if (balance >= 10) {
      balanceClass = 'balance-medium';
    } else if (balance >= 5) {
      balanceClass = 'balance-mediumlow';
    } else if (balance > 0) {
      balanceClass = 'balance-low';
    }
    
    // Handle key display format (hide middle part)
    const truncatedKey = truncateKey(key.key);
    
    // Format update time
    const updateTime = key.last_updated ? new Date(key.last_updated).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Unknown';
    
    // Display balance or invalid status
    const balanceDisplay = isValid ? key.balance : i18next.t('keyCard.invalid');
    
    keyElement.innerHTML = `
      <div class="key-card-top">
        <div class="key-text">${truncatedKey}</div>
        <button class="copy-button" data-i18n="keyCard.copyButton">Copy</button>
      </div>
      <div class="key-card-middle">
        <div class="balance ${balanceClass}">
          ${balanceDisplay}
        </div>
      </div>
      <div class="key-card-bottom">
        <span data-i18n="keyCard.updatedAt">Updated at</span> ${updateTime}
      </div>
    `;
    
    // Add hover effect tip
    keyElement.setAttribute('title', 'Click to view full key');
    
    // Add click event for each key card
    keyElement.addEventListener('click', function(e) {
      if (!e.target.closest('.copy-button')) {
        showToast(`Key: ${key.key}`, 3000);
      }
    });
    
    // Add click event for copy button
    const copyButton = keyElement.querySelector('.copy-button');
    copyButton.addEventListener('click', function(e) {
      e.stopPropagation();
      copyToClipboard(key.key);
      showToast('toasts.copied', 2000);
    });
    
    keysContainer.appendChild(keyElement);
  });
  
  // Update pagination info
  const totalPages = Math.ceil(allKeys.length / keysPerPage);
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
  
  // Update pagination button status
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Handle key display format, hide middle part
export function truncateKey(key) {
  if (key.length <= 15) return key;
  const start = key.substring(0, 10);
  const end = key.substring(key.length - 5);
  return start + '...' + end;
}

// Go to previous page
export function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    displayCurrentPage();
  }
}

// Go to next page
export function goToNextPage() {
  const totalPages = Math.ceil(allKeys.length / keysPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayCurrentPage();
  }
}

// Copy single key to clipboard
export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('toasts.copied');
  }).catch(err => {
    console.error('Copy failed:', err);
    showToast('toasts.copyFailed', true);
  });
}

// Copy all keys with newline separator
export function copyAllKeysWithNewline() {
  const keys = allKeys.map(item => item.key);
  if (keys.length === 0) {
    return;
  }
  
  navigator.clipboard.writeText(keys.join(`
`)).then(() => {
    showToast('toasts.batchCopyNewline');
  }).catch(err => {
    console.error('Batch copy failed:', err);
    showToast('toasts.batchCopyFailed', true);
  });
}

// Copy all keys with comma separator
export function copyAllKeysWithComma() {
  const keys = allKeys.map(item => item.key);
  if (keys.length === 0) {
    return;
  }
  
  navigator.clipboard.writeText(keys.join(',')).then(() => {
    showToast('toasts.batchCopyComma');
  }).catch(err => {
    console.error('Batch copy failed:', err);
    showToast('toasts.batchCopyFailed', true);
  });
}