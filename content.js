function injectHook(url, type = '') {
  const hookScript = document.createElement("script");
  if (type !== '') hookScript.type = "module";
  hookScript.src = url;
  hookScript.onload = function () {
    this.remove();
  };
  (document.head || document.body || document.documentElement).appendChild(hookScript);
}

// Ví dụ sử dụng:
// injectHook(chrome.runtime.getURL('/lib/emoji.js'));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'TabUpdated' && document.location.href.includes('https://www.facebook.com/stories')) {
    // injectHook(chrome.runtime.getURL(`/lib/story.js`), 'module');
  }
});

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}
