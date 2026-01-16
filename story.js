const STORY_URL_PREFIX = "https://www.facebook.com/stories/";
const TARGET_SELECTOR = ".x11lhmoz.x78zum5.x1q0g3np.xsdox4t.xbudbmw.x10l6tqk.xwa60dl.xl56j7k.xtuxyv6";

// --- KHỐI LẮNG NGHE LỆNH (MESSAGE LISTENER) ---
// Biến này để lưu trạng thái bật/tắt (nếu bạn chưa khai báo thì dòng này rất quan trọng)
if (typeof isUIEnabled === 'undefined') var isUIEnabled = true;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("🔔 Story.js nhận lệnh:", msg.action);

  // Xử lý 1: Lệnh thả tim từ Popup
  if (msg.action === 'TRIGGER_REACTION') {
    const storyId = getStoryId();
    const fb_dtsg = getFbdtsg();
    const user_id = getUserId();

    if (storyId && fb_dtsg && user_id) {
      reactStory(user_id, fb_dtsg, storyId, msg.payload)
        .then(res => {
          console.log("✅ Đã thả tim:", msg.payload);
          sendResponse({ status: 'success' });
        })
        .catch(err => {
          console.error("❌ Lỗi:", err);
          sendResponse({ status: 'error', message: JSON.stringify(err) });
        });
    } else {
      console.warn("⚠️ Thiếu thông tin (ID/Token) để thả tim.");
      sendResponse({ status: 'error', message: "Không tìm thấy Story ID" });
    }
  }

  // Xử lý 2: Lệnh Bật/Tắt nút tròn
  else if (msg.action === 'TOGGLE_UI') {
    isUIEnabled = msg.payload;
    if (isUIEnabled) {
      console.log("🟢 Đã bật giao diện");
      if (location.href.includes("facebook.com/stories")) init();
    } else {
      console.log("🔴 Đã tắt giao diện");
      stopDomObserver(); // Hàm xóa nút cũ của bạn
      if (typeof reactContainer !== 'undefined' && reactContainer) reactContainer.remove();
    }
    sendResponse({ status: 'ok' });
  }

  return true; // BẮT BUỘC: Dòng này giữ kết nối để chờ hàm async (reactStory) trả về kết quả
});
// -------------------------------------------------

let reactContainer = null;
let domObserver = null;
let lastInjectedTarget = null;
let currentUrl = location.href;
let pollingIntervalId = null;
let historyPatched = false;
let lastStoryId = null;
console.log("🔍 Khởi tạo thành công — URL:", currentUrl);

function startUrlObserver() {
  const handleUrlChange = () => {
    console.log("🌐 URL đã bị thay đổi hiện tại là:", currentUrl);
    if (currentUrl.startsWith(STORY_URL_PREFIX)) {
      if (isUIEnabled) init(); 
    }
    else {
      console.log("⛔ Đã rời khỏi trang Stories");
      stopDomObserver();
    }
  };

  if (!historyPatched) {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = function (...args) {
      const result = originalPush.apply(this, args);
      setTimeout(() => {
        const newUrl = location.href;
        if (newUrl !== currentUrl) {
          currentUrl = newUrl;
          handleUrlChange();
        }
      }, 0
      );
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplace.apply(this, args);
      setTimeout(() => {
        const newUrl = location.href;
        if (newUrl !== currentUrl) {
          currentUrl = newUrl;
          handleUrlChange();
        }
      }, 0);
      return result;
    };

    window.addEventListener("popstate", () => {
      setTimeout(() => {
        const newUrl = location.href;
        if (newUrl !== currentUrl) {
          currentUrl = newUrl;
          handleUrlChange();
        }
      }, 0);
    }
    );
    historyPatched = true;
  }

  if (!pollingIntervalId) {
    pollingIntervalId = setInterval(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        handleUrlChange();
      }
    }, 500
    );
  }

  if (currentUrl.startsWith(STORY_URL_PREFIX)) {
    init();
  } 
  else {}
}

function stopUrlObserver() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
    console.log("🛑 Cơ chế dự phòng bằng polling đã dừng.");
  }
}

async function init() {
  if (domObserver) {
    console.log("ℹ️ DOM Observer đang chạy.");
    return;
  }

  try {
    const emojiUrl = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL? chrome.runtime.getURL("db/emoji.json"): "db/emoji.json";
    const emojiJson = await fetch(emojiUrl);
    const EMOJI_LIST = await emojiJson.json();
    if (!reactContainer) {
      createReactContainer(EMOJI_LIST);
      const btn = reactContainer.querySelector(".btn-react");
      if (btn) {
        btn.classList.add("slide-in");
        setTimeout(() => {
          btn.classList.remove("slide-in");
        }, 700
        );
      }
    }
    startDomObserver();
  } 

  catch (e) {
    console.error("❌ Lỗi load emoji.json:", e);
  }
}

function createReactContainer(EMOJI_LIST) {
  reactContainer = document.createElement("div");
  reactContainer.className = "react-container";
  const btnReact = document.createElement("div");
  btnReact.className = "btn-react";
  btnReact.textContent = "MORE";
  const emojiGroup = document.createElement("ul");
  emojiGroup.className = "emoji-group";
  emojiGroup.addEventListener("wheel", (e) => {
    e.stopPropagation();
  }, { passive: true });
  const savedBg = localStorage.getItem("emojiPopupBg");

  if (savedBg) {
    emojiGroup.style.backgroundImage = `url(${savedBg})`;
    emojiGroup.style.backgroundSize = "cover";
    emojiGroup.style.backgroundPosition = "center";
    emojiGroup.style.backgroundColor = "transparent";
  }

  const btnChangeBg = document.createElement("button");
  btnChangeBg.className = "btn-bg";
  btnChangeBg.innerHTML = "<span class='btn-icon'>🖼️</span>";
  const btnResetBg = document.createElement("button");
  btnResetBg.className = "btn-reset";
  btnResetBg.innerHTML = "<span class='btn-icon'>♻️</span>";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  fileInput.onchange = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      emojiGroup.style.backgroundImage = `url(${reader.result})`;
      emojiGroup.style.backgroundSize = "cover";
      emojiGroup.style.backgroundPosition = "center";
      emojiGroup.style.backgroundColor = "transparent";
      localStorage.setItem("emojiPopupBg", reader.result);
      console.log("🖼️ Đã thay ảnh nền.");
    };
    reader.readAsDataURL(file);
  };

  btnChangeBg.onclick = (e) => {
    console.log("🖼️ Đang chọn hình nền ...")
    e.stopPropagation();
    fileInput.click();
  };

  btnResetBg.onclick = () => {
    emojiGroup.style.backgroundImage = "none";
    emojiGroup.style.backgroundColor = isDarkMode() ? "rgba(40,40,40,0.9)" : "rgba(255,255,255,0.75)";
    localStorage.removeItem("emojiPopupBg");
    console.log("🔃 Nền đã reset.");
  };

  btnReact.onclick = () => {
  const visible = emojiGroup.classList.toggle("emoji-group--show");
  reactContainer.classList.toggle("react-container--expanded", visible);

  // 🔒 KHÓA 2 NÚT NGAY LẬP TỨC
  btnChangeBg.disabled = true;
  btnResetBg.disabled = true;
  btnChangeBg.style.pointerEvents = "none";
  btnResetBg.style.pointerEvents = "none";

  if (visible) {
    // ✅ CHỜ animation chạy xong mới mở
    const onDone = (e) => {
      if (e.target !== btnResetBg) return;
      btnChangeBg.disabled = false;
      btnResetBg.disabled = false;
      btnChangeBg.style.pointerEvents = "auto";
      btnResetBg.style.pointerEvents = "auto";
      btnResetBg.removeEventListener("transitionend", onDone);
    };
    
    btnResetBg.addEventListener("transitionend", onDone);
  }
  };

  EMOJI_LIST.forEach((emoji) => {
    const li = document.createElement("li");
    li.className = "emoji";
    li.textContent = emoji.value;
    li.onclick = async () => {
      const storyId = getStoryId();
      const fb_dtsg = getFbdtsg();
      const user_id = getUserId();
      if (!storyId || !fb_dtsg || !user_id) {
        console.log("⚠️ Thiếu dữ liệu để gửi reaction.");
        return;
      }
      try {
        await reactStory(user_id, fb_dtsg, storyId, emoji.value);
        console.log(`${storyId} : ${emoji.value}`);
      } 
      catch (e) {
        console.error(e);
      }
    };
    emojiGroup.appendChild(li);
  }
  );

  document.addEventListener("contextmenu", function (e) {
    if (reactContainer && reactContainer.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  reactContainer.appendChild(btnReact);
  reactContainer.appendChild(btnChangeBg);
  reactContainer.appendChild(btnResetBg);
  reactContainer.appendChild(fileInput);
  reactContainer.appendChild(emojiGroup);

  reactContainer.addEventListener("mouseenter", () => {
    document.querySelectorAll("video").forEach(v => v.pause());
  });

  reactContainer.addEventListener("mouseleave", () => {
    document.querySelectorAll("video").forEach(v => v.play());
  });
}

function startDomObserver() {
  const tryInject = () => {
    const currentStoryId = getStoryId();

    // 🔥 PHÁT HIỆN ĐỔI VIDEO
    if (currentStoryId && currentStoryId !== lastStoryId) {
      // 🧹 GỠ NÚT MORE
      if (reactContainer?.isConnected) {
        reactContainer.remove();
      }
      lastInjectedTarget = null;
      lastStoryId = currentStoryId;
    }

    // 🔴 selector chính
    const primaryTarget = document.querySelector(TARGET_SELECTOR);

    // 🟡 selector dự phòng (đổi selector nếu bạn có)
    const fallbackTarget = document.querySelector(".YOUR_FALLBACK_SELECTOR");

    const target = primaryTarget || fallbackTarget;
    if (!target) return;

    // 🔁 INJECT LẠI TỪ ĐẦU
    if (!reactContainer.isConnected) {
      try {
        target.appendChild(reactContainer);
        lastInjectedTarget = target;
      } catch (e) {}
    }
  };
  tryInject();
  domObserver = new MutationObserver(() => {
    tryInject();
  });

  const observeTarget = document.body || document.documentElement;
  if (observeTarget) {
    domObserver.observe(observeTarget, {
      childList: true,
      subtree: true
    });
  }
}

function stopDomObserver() {
  if (domObserver) {
    try {
      domObserver.disconnect();
    } 
    catch (e) {
      console.warn("⚠️ Lỗi khi disconnect DOM observer:", e);
    }
    domObserver = null;
    lastInjectedTarget = null;
  }
  try {
    if (reactContainer && reactContainer.parentNode) {
      reactContainer.parentNode.removeChild(reactContainer);
      //console.log("🗑️ React container removed from DOM.");
    }
  } 
  catch (e) {}
}

function getStoryId() {
  const el = document.getElementsByClassName("xh8yej3 x1n2onr6 xl56j7k x5yr21d x78zum5 x6s0dn4");
  return el.length ? el[el.length - 1].getAttribute("data-id") : null;
}

let cachedDtsg = null;
function getFbdtsg() {
  if (cachedDtsg) return cachedDtsg;
  const m = /"DTSGInitialData".+?"token":"(.+?)"/.exec(document.documentElement.innerHTML);
  return (cachedDtsg = m?.[1] || null);
}

function getUserId() {
  const m = /c_user=(\d+);/gm.exec(document.cookie);
  return m ? m[1] : null;
}

async function reactStory(user_id, fb_dtsg, story_id, message) {
  const variables = {
    input: {
      lightweight_reaction_actions: {
        offsets: [0],
        reaction: message
      },
      story_id,
      story_reply_type: "LIGHT_WEIGHT",
      actor_id: user_id,
      client_mutation_id: 7
    }
  };

  const body = new URLSearchParams();
  body.append("av", user_id);
  body.append("__user", user_id);
  body.append("__a", 1);
  body.append("fb_dtsg", fb_dtsg);
  body.append("fb_api_caller_class", "RelayModern");
  body.append("fb_api_req_friendly_name", "useStoriesSendReplyMutation");
  body.append("variables", JSON.stringify(variables));
  body.append("server_timestamps", true);
  body.append("doc_id", "3769885849805751");

  const res = await fetch("https://www.facebook.com/api/graphql/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const json = await res.json();
  if (json.errors) throw json.errors;
  return json;
}

function isDarkMode() {
  const htmlClass = document.documentElement.className;
  return (
    htmlClass.includes("dark") ||
    htmlClass.includes("theme_dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

startUrlObserver();