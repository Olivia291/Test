/**
 * 划词翻译 - Background Service Worker
 * 处理百度翻译 API 请求（绕过 CORS）
 */

const BAIDU_API_URL = "https://fanyi-api.baidu.com/api/trans/vip/translate";
const APP_ID = "20260528002621360";
const SECRET_KEY = "_UNdBIr2dHiEQBp9iuDP";

/**
 * MD5 实现（使用 Uint32Array 确保位运算正确）
 */
function md5(str) {
  // UTF-8 编码
  const encoder = new TextEncoder();
  const msg = encoder.encode(str);
  const len = msg.length;

  // 填充
  const bitLen = len * 8;
  const padLen = ((56 - (len + 1) % 64) + 64) % 64;
  const buf = new Uint8Array(len + 1 + padLen + 8);
  buf.set(msg);
  buf[len] = 0x80;
  // 写入 64 位长度（小端序）
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 8, bitLen >>> 0, true);
  view.setUint32(buf.length - 4, 0, true);

  // 初始值
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // 每轮常量
  const S = [
    7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
    5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
    4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
    6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
  ];
  const K = new Uint32Array([
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,
    0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,
    0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,
    0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,
    0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,
    0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,
    0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,
    0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,
    0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
  ]);

  function leftRotate(val, shift) {
    return ((val << shift) | (val >>> (32 - shift))) >>> 0;
  }

  // 处理每个 512 位块
  for (let offset = 0; offset < buf.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (~D | 0);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + leftRotate(F, S[i])) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // 输出小端序 hex
  function toHex(n) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, n, true);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/** 监听来自 content script 的翻译请求 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const word = request.word;
    const salt = Date.now().toString();
    const signStr = APP_ID + word + salt + SECRET_KEY;
    const sign = md5(signStr);

    const url = `${BAIDU_API_URL}?q=${encodeURIComponent(word)}&from=en&to=zh&appid=${APP_ID}&salt=${salt}&sign=${sign}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道开启，等待异步响应
  }
});
