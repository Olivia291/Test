/**
 * 划词翻译 - Content Script
 * 功能：选中英文单词 → 弹出中文释义 + 词性 + 英式发音
 */

(function () {
  "use strict";

  // ========== 状态 ==========
  let popupEl = null;
  let isPopupVisible = false;
  let currentWord = "";

  // ========== 工具函数 ==========

  /** 通过 background script 调用百度翻译 API */
  async function translateWord(word) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "translate", word: word },
        (response) => {
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "翻译请求失败"));
          }
        }
      );
    });
  }

  /** 解析百度翻译结果，提取词性和释义 */
  function parseTranslation(data) {
    if (!data.trans_result || data.trans_result.length === 0) {
      return null;
    }

    const result = data.trans_result[0];
    const dst = result.dst || "";

    // 尝试从 dst 中解析词性
    const posPattern = /^([a-z]+\.\s*)/;
    const match = dst.match(posPattern);

    let pos = "";
    let translation = dst;

    if (match) {
      pos = match[1].trim();
      translation = dst.slice(match[0].length).trim();
    }

    return {
      word: result.src,
      pos: pos,
      translation: translation,
    };
  }

  /** 英式发音（使用 Web Speech API） */
  function speakWord(word) {
    if (!("speechSynthesis" in window)) {
      console.warn("当前浏览器不支持语音合成");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(
      (v) => v.lang === "en-GB" || v.lang.startsWith("en-GB")
    );
    if (britishVoice) {
      utterance.voice = britishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // ========== 弹窗管理 ==========

  /** 创建弹窗 DOM */
  function createPopup() {
    if (popupEl) return popupEl;

    popupEl = document.createElement("div");
    popupEl.className = "word-translator-popup";
    popupEl.innerHTML = `
      <div class="wt-header">
        <span class="wt-word"></span>
        <button class="wt-speak-btn" title="英式发音">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
      </div>
      <div class="wt-pos"></div>
      <div class="wt-translation"></div>
    `;

    const speakBtn = popupEl.querySelector(".wt-speak-btn");
    speakBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      speakWord(currentWord);
    });

    popupEl.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.body.appendChild(popupEl);
    return popupEl;
  }

  /** 显示弹窗 */
  function showPopup(x, y) {
    const popup = createPopup();

    const popupWidth = 280;
    const popupHeight = 120;
    const padding = 10;

    let left = x + padding;
    let top = y + padding;

    if (left + popupWidth > window.innerWidth) {
      left = x - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight) {
      top = y - popupHeight - padding;
    }

    left = Math.max(padding, left);
    top = Math.max(padding, top);

    popup.style.left = left + "px";
    popup.style.top = top + "px";

    requestAnimationFrame(() => {
      popup.classList.add("visible");
    });

    isPopupVisible = true;
  }

  /** 隐藏弹窗 */
  function hidePopup() {
    if (!popupEl || !isPopupVisible) return;

    popupEl.classList.remove("visible");
    isPopupVisible = false;

    setTimeout(() => {
      if (!isPopupVisible && popupEl) {
        popupEl.style.display = "none";
      }
    }, 150);
  }

  /** 更新弹窗内容 */
  function updatePopupContent(word, pos, translation) {
    if (!popupEl) return;

    popupEl.querySelector(".wt-word").textContent = word;
    popupEl.querySelector(".wt-pos").textContent = pos;
    popupEl.querySelector(".wt-translation").textContent = translation;
    popupEl.style.display = "block";
  }

  /** 显示加载状态 */
  function showLoading() {
    if (!popupEl) return;
    popupEl.querySelector(".wt-word").textContent = currentWord;
    popupEl.querySelector(".wt-pos").textContent = "";
    popupEl.querySelector(".wt-translation").innerHTML =
      '<span class="wt-loading">翻译中...</span>';
    popupEl.style.display = "block";
  }

  /** 显示错误状态 */
  function showError(msg) {
    if (!popupEl) return;
    popupEl.querySelector(".wt-translation").innerHTML =
      `<span class="wt-error">${msg}</span>`;
  }

  // ========== 事件处理 ==========

  /** 处理文本选择 */
  async function handleSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || !/^[a-zA-Z][\w'-]*[a-zA-Z]$/.test(text)) {
      return;
    }

    currentWord = text.toLowerCase();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    showPopup(rect.right, rect.bottom);
    showLoading();

    try {
      const data = await translateWord(currentWord);
      const parsed = parseTranslation(data);

      if (parsed) {
        updatePopupContent(
          parsed.word,
          parsed.pos ? `【${parsed.pos}】` : "",
          parsed.translation
        );
      } else {
        showError("未找到翻译结果");
      }
    } catch (err) {
      console.error("翻译出错:", err);
      showError("翻译失败，请稍后重试");
    }
  }

  // 监听鼠标抬起事件
  document.addEventListener("mouseup", (e) => {
    if (popupEl && popupEl.contains(e.target)) return;

    setTimeout(() => {
      handleSelection();
    }, 100);
  });

  // 点击空白区域关闭弹窗
  document.addEventListener("mousedown", (e) => {
    if (popupEl && !popupEl.contains(e.target)) {
      hidePopup();
    }
  });

  // 预加载语音列表
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
})();
