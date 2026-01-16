document.addEventListener('DOMContentLoaded', async () => {
  // 1. Xử lý chuyển tab
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 2. Load Emoji
  const grid = document.getElementById('emoji-grid');
  try {
    const res = await fetch('db/emoji.json');
    const emojis = await res.json();
    grid.innerHTML = '';
    emojis.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.textContent = e.value;
      btn.onclick = () => sendCommand('TRIGGER_REACTION', e.value);
      grid.appendChild(btn);
    });
  } catch (err) { grid.textContent = "Lỗi load emoji"; }

  // 3. Xử lý Cài đặt Bật/Tắt nút trên Web
  const toggle = document.getElementById('toggle-ui');
  
  // Lấy trạng thái đã lưu (mặc định là true - hiện nút)
  chrome.storage.local.get({ showInPageUI: true }, (data) => {
    toggle.checked = data.showInPageUI;
  });

  toggle.addEventListener('change', () => {
    const isChecked = toggle.checked;
    chrome.storage.local.set({ showInPageUI: isChecked });
    // Gửi lệnh xuống content script để ẩn/hiện ngay lập tức
    sendCommand('TOGGLE_UI', isChecked);
  });
});

function sendCommand(action, payload) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action, payload });
    }
  });
}   