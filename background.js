chrome.runtime.onInstalled.addListener()
chrome.action.setBadgeText({ text: "" });
if (changeInfo.status === "complete") {
  if (tab.url && tab.url.startsWith("https://www.facebook.com/stories/")) {
    console.log("📌 Đang inject story.js vào tab:", tab.url);
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["story.js"]
    });
  }
}

