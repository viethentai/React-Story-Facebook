(async () => {
  if (document.getElementsByClassName('btn-react').length > 0) return;

  try {
    const emojiJson = await fetch(chrome.runtime.getURL('db/emoji.json'));
    const EMOJI_LIST = await emojiJson.json();
    loadModal(EMOJI_LIST);
  } catch (e) {
    console.error(e);
  }
})();

function loadModal(EMOJI_LIST) {
  const fb_dtsg = getFbdtsg();
  const user_id = getUserId();
  console.log({ fb_dtsg, user_id });

  const timeoutAttach = setInterval(() => {
    // Tạo nút "MORE"
    const btnReact = document.createElement('div');
    btnReact.textContent = "MORE";
    btnReact.setAttribute('class', 'btn-react');

    // Tạo popup emoji
    const emojiGroup = document.createElement('ul');
    emojiGroup.setAttribute('class', 'emoji-group');

    btnReact.onclick = () => emojiGroup.classList.toggle('emoji-group--show');

    EMOJI_LIST.forEach(emoji => {
      const emojiLi = document.createElement('li');
      emojiLi.setAttribute('class', 'emoji');
      emojiLi.setAttribute('value', emoji.value);
      emojiLi.textContent = emoji.value;
      emojiLi.onclick = async () => {
        const storyId = getStoryId();
        try {
          await reactStory(user_id, fb_dtsg, storyId, emoji.value);
          console.log(storyId + " : " + emoji.value);
        } catch (e) {
          console.error(e);
        }
      };
      emojiGroup.appendChild(emojiLi);
    });

    const reactContainer = document.createElement('div');
    reactContainer.setAttribute('class', 'react-container');
    reactContainer.appendChild(btnReact);
    reactContainer.appendChild(emojiGroup);

    // Tự động pause/play video khi hover vào toàn bộ container
    reactContainer.addEventListener('mouseenter', () => {
      document.querySelectorAll('.x78zum5 video').forEach(v => v.pause());
    });
    reactContainer.addEventListener('mouseleave', () => {
      document.querySelectorAll('.x78zum5 video').forEach(v => v.play());
    });

    // ---- Tìm target ----
    const target = document.querySelector(
      ".x11lhmoz.x78zum5.x1q0g3np.xsdox4t.xbudbmw.x10l6tqk.xwa60dl.xl56j7k.xtuxyv6"
    );

    if (target) {
      clearInterval(timeoutAttach); // Dừng vòng lặp
      target.appendChild(reactContainer);
      console.log("✅ React container gắn vào target:", target);
    } else {
      console.log("⚠️ Không tìm thấy target, tiếp tục thử lại...");
    }
  }, 500); // Lặp lại mỗi 0.5s nếu chưa tìm thấy
}

// --- Helper functions ---
function getStoryId() {
  const htmlStory = document.getElementsByClassName(
    'xh8yej3 x1n2onr6 xl56j7k x5yr21d x78zum5 x6s0dn4'
  );
  return htmlStory.length > 0
    ? htmlStory[htmlStory.length - 1].getAttribute('data-id')
    : null;
}

function getFbdtsg() {
  const regex = /"DTSGInitialData",\[],{"token":"(.+?)"/gm;
  const resp = regex.exec(document.documentElement.innerHTML);
  return resp ? resp[1] : null;
}

function getUserId() {
  const regex = /c_user=(\d+);/gm;
  const resp = regex.exec(document.cookie);
  return resp ? resp[1] : null;
}

function reactStory(user_id, fb_dtsg, story_id, message) {
  return new Promise(async (resolve, reject) => {
    const variables = {
      input: {
        lightweight_reaction_actions: {
          offsets: [0],
          reaction: message
        },
        story_id,
        story_reply_type: 'LIGHT_WEIGHT',
        actor_id: user_id,
        client_mutation_id: 7
      }
    };

    const body = new URLSearchParams();
    body.append('av', user_id);
    body.append('__user', user_id);
    body.append('__a', 1);
    body.append('fb_dtsg', fb_dtsg);
    body.append('fb_api_caller_class', 'RelayModern');
    body.append('fb_api_req_friendly_name', 'useStoriesSendReplyMutation');
    body.append('variables', JSON.stringify(variables));
    body.append('server_timestamps', true);
    body.append('doc_id', '3769885849805751');

    try {
      const response = await fetch('https://www.facebook.com/api/graphql/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const res = await response.json();
      if (res.errors) return reject(res);
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
}
