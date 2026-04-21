const portInput = document.getElementById('port');
const tokenInput = document.getElementById('token');
const saveBtn = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get({ gopeedPort: '9999', gopeedToken: '' }, ({ gopeedPort, gopeedToken }) => {
  portInput.value = gopeedPort;
  tokenInput.value = gopeedToken;
});

saveBtn.addEventListener('click', () => {
  const gopeedPort = portInput.value.trim() || '9999';
  const gopeedToken = tokenInput.value.trim();

  chrome.storage.sync.set({ gopeedPort, gopeedToken }, () => {
    status.textContent = 'Saved ✓';
    setTimeout(() => (status.textContent = ''), 2000);
  });
});
