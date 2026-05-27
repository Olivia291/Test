/**
 * 划词翻译 - Content Script
 * 功能：选中英文单词 → 弹出中文释义 + 词性 + 英式发音
 */

(function () {
  "use strict";

  // ========== 配置 ==========
  const BAIDU_API_URL = "https://fanyi-api.baidu.com/api/trans/vip/translate";
  const APP_ID = "20260528002621360";
  const SECRET_KEY = "_UNdBIr2dHiEQBp9iuDP";

  // ========== 状态 ==========
  let popupEl = null;
  let isPopupVisible = false;
  let currentWord = "";

  // ========== 工具函数 ==========

  /** 生成百度翻译 API 签名 */
  function generateSign(query, salt) {
    const str = APP_ID + query + salt + SECRET_KEY;
    // 使用 SubtleCrypto 计算 MD5（百度 API 需要 MD5）
    return md5(str);
  }

  /** 简易 MD5 实现（浏览器端无原生 MD5） */
  function md5(string) {
    function md5cycle(x, k) {
      let a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function md51(s) {
      let n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878],
        i;
      for (i = 64; i <= n; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++)
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function md5blk(s) {
      let md5blks = [],
        i;
      for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] =
          s.charCodeAt(i) +
          (s.charCodeAt(i + 1) << 8) +
          (s.charCodeAt(i + 2) << 16) +
          (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }
    let hex_chr = "0123456789abcdef".split("");
    function rhex(n) {
      let s = "",
        j = 0;
      for (; j < 4; j++)
        s +=
          hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
      return s;
    }
    function hex(x) {
      for (let i = 0; i < x.length; i++) x[i] = rhex(x[i]);
      return x.join("");
    }
    function add32(a, b) {
      return (a + b) & 0xffffffff;
    }
    return hex(md51(string));
  }

  /** 调用百度翻译 API */
  async function translateWord(word) {
    const salt = Date.now().toString();
    const sign = generateSign(word, salt);

    const params = new URLSearchParams({
      q: word,
      from: "en",
      to: "zh",
      appid: APP_ID,
      salt: salt,
      sign: sign,
    });

    const response = await fetch(`${BAIDU_API_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.error_code) {
      throw new Error(`翻译失败: ${data.error_code}`);
    }

    return data;
  }

  /** 解析百度翻译结果，提取词性和释义 */
  function parseTranslation(data) {
    if (!data.trans_result || data.trans_result.length === 0) {
      return null;
    }

    const result = data.trans_result[0];
    const dst = result.dst || "";

    // 尝试从 dst 中解析词性（百度翻译有时会在结果中包含词性标注）
    // 格式可能为: "n. 名词释义；adj. 形容词释义" 或直接返回中文
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

    // 取消之前的朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB"; // 英式发音
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // 尝试找到英式发音的语音
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

    // 朗读按钮事件
    const speakBtn = popupEl.querySelector(".wt-speak-btn");
    speakBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      speakWord(currentWord);
    });

    // 阻止弹窗内点击冒泡（避免触发关闭）
    popupEl.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.body.appendChild(popupEl);
    return popupEl;
  }

  /** 显示弹窗 */
  function showPopup(x, y) {
    const popup = createPopup();

    // 计算弹窗位置，确保不超出视口
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

    // 确保不超出左/上边界
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    popup.style.left = left + "px";
    popup.style.top = top + "px";

    // 触发动画
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

    // 动画结束后隐藏
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

    // 只处理英文单词（允许带连字符和撇号）
    if (!text || !/^[a-zA-Z][\w'-]*[a-zA-Z]$/.test(text)) {
      return;
    }

    currentWord = text.toLowerCase();

    // 获取选区的位置
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 显示加载弹窗
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

  // 监听鼠标抬起事件（划词后触发翻译）
  document.addEventListener("mouseup", (e) => {
    // 如果点击的是弹窗内部，不处理
    if (popupEl && popupEl.contains(e.target)) return;

    // 延迟一小段时间确保选择完成
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
