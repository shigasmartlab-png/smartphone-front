/* ============================================================
   初期セットアップ
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
  setupCoatTabs();
  setupOsSwitch();
  setupAccordions();
});

/* ============================================================
   メインタブ切り替え（フェード対応）
============================================================ */
function setupMainTabs() {
  const tabButtons = document.querySelectorAll(".main-tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;

      tabContents.forEach(c => c.classList.remove("active"));
      const target = document.getElementById(`tab-${tab}`);
      if (target) target.classList.add("active");
    };
  });
}

/* ============================================================
   コーティングタブ切り替え（iOS風トグル）
============================================================ */
function setupCoatTabs() {
  const coatSwitch = document.getElementById("coat-switch");
  const coatButtons = document.querySelectorAll(".coat-btn");
  const coatContents = document.querySelectorAll(".coat-content");

  // 初期状態
  coatSwitch.classList.add("glass");

  coatButtons.forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.coat; // "glass" or "ceramic"

      // ボタンの active 切り替え
      coatButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // トグルノブの位置変更
      coatSwitch.classList.remove("glass", "ceramic");
      coatSwitch.classList.add(target);

      // コンテンツ切り替え
      coatContents.forEach(c => c.classList.remove("active"));
      const content = document.getElementById(`coat-${target}`);
      if (content) content.classList.add("active");
    };
  });
}


/* ============================================================
   API ベース URL
============================================================ */
const API_BASE = "https://estimate-api-6j8x.onrender.com";

/* ============================================================
   品質ランク説明文
============================================================ */
const QUALITY_DESCRIPTIONS = {
  "互換品（LCD）": "純正ではない液晶パネル。価格が安いが、発色や明るさは純正より劣る場合があります。",
  "互換品（OLED）": "純正ではないOLEDパネル。純正に近い発色でコスパが良いタイプ。",
  "再生品（純正同等）": "純正パネルを再利用した高品質パネル。純正とほぼ同等の表示品質。",
  "標準": "PSE認証マーク付きの互換バッテリーです。"
};

/* ============================================================
   OS 切り替え（iOS風トグル＋API連動）
============================================================ */
let currentOS = "iPhone";

function setupOsSwitch() {
  const osSwitch = document.getElementById("os-switch");
  const btnIphone = document.getElementById("btn-iphone");
  const btnAndroid = document.getElementById("btn-android");

  if (!osSwitch || !btnIphone || !btnAndroid) return;

  // 初期状態
  osSwitch.classList.add("iphone");
  btnIphone.classList.add("active");

  btnIphone.onclick = () => switchOS("iPhone");
  btnAndroid.onclick = () => switchOS("Android");
}

function switchOS(os) {
  const osSwitch = document.getElementById("os-switch");
  const btnIphone = document.getElementById("btn-iphone");
  const btnAndroid = document.getElementById("btn-android");

  currentOS = os;

  if (osSwitch) {
    if (os === "iPhone") {
      osSwitch.classList.add("iphone");
      osSwitch.classList.remove("android");
    } else {
      osSwitch.classList.add("android");
      osSwitch.classList.remove("iphone");
    }
  }

  if (btnIphone && btnAndroid) {
    btnIphone.classList.toggle("active", os === "iPhone");
    btnAndroid.classList.toggle("active", os === "Android");
  }

  loadModels();
}

/* ============================================================
   初期ロード
============================================================ */
window.onload = async () => {
  await loadModels();
};

/* ============================================================
   機種一覧
============================================================ */
async function loadModels() {
  const res = await fetch(`${API_BASE}/models?os=${encodeURIComponent(currentOS)}`);
  const data = await res.json();

  const modelSelect = document.getElementById("model");
  if (!modelSelect) return;

  modelSelect.innerHTML = "";

  (data.models || []).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSelect.appendChild(opt);
  });

  modelSelect.onchange = loadRepairs;
  await loadRepairs();
}

/* ============================================================
   故障内容 + 品質ランク
============================================================ */
async function loadRepairs() {
  const modelSelect = document.getElementById("model");
  if (!modelSelect) return;

  const model = modelSelect.value;

  const res = await fetch(`${API_BASE}/repairs?model=${encodeURIComponent(model)}`);
  const data = await res.json();

  const repairSelect = document.getElementById("repair_type");
  const qualitySelect = document.getElementById("quality");
  if (!repairSelect || !qualitySelect) return;

  repairSelect.innerHTML = "";
  qualitySelect.innerHTML = "";

  const grouped = {};
  (data.repairs || []).forEach(r => {
    if (!grouped[r.name]) grouped[r.name] = [];
    grouped[r.name].push({
      quality: r.quality,
      status: r.status
    });
  });

  Object.keys(grouped).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    repairSelect.appendChild(opt);
  });

  repairSelect.onchange = () => updateQuality(grouped);
  updateQuality(grouped);
}

function updateQuality(grouped) {
  const repairSelect = document.getElementById("repair_type");
  const qualitySelect = document.getElementById("quality");
  if (!repairSelect || !qualitySelect) return;

  const repair = repairSelect.value;
  qualitySelect.innerHTML = "";

  (grouped[repair] || []).forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.quality;

    if (item.status === "available") {
      opt.textContent = item.quality;
    } else {
      opt.textContent = `${item.quality}（未対応）`;
      opt.disabled = true;
    }

    qualitySelect.appendChild(opt);
  });

  updateQualityDescription();
  qualitySelect.onchange = updateQualityDescription;
}

/* ============================================================
   品質ランク説明文
============================================================ */
function updateQualityDescription() {
  const qualitySelect = document.getElementById("quality");
  const descEl = document.getElementById("quality-description");
  if (!qualitySelect || !descEl) return;

  const q = qualitySelect.value;
  const desc = QUALITY_DESCRIPTIONS[q] || "";
  descEl.textContent = desc;
}

/* ============================================================
   修理タブ：オプション
============================================================ */
function getSelectedOptions() {
  const options = [];

  const battery = document.getElementById("opt-battery");
  if (battery && battery.checked) {
    options.push("バッテリー大容量化");
  }

  const coatingSelect = document.getElementById("opt-coating");
  if (coatingSelect && coatingSelect.value) {
    options.push(coatingSelect.value);
  }

  return options;
}

/* ============================================================
   修理見積もり
============================================================ */
async function estimate() {
  const modelEl = document.getElementById("model");
  const repairEl = document.getElementById("repair_type");
  const qualityEl = document.getElementById("quality");
  const resultArea = document.getElementById("result");

  if (!modelEl || !repairEl || !qualityEl || !resultArea) return;

  const model = modelEl.value;
  const repair = repairEl.value;
  const quality = qualityEl.value;

  const selectedOptions = getSelectedOptions().join(",");

  const url =
    `${API_BASE}/estimate?model=${encodeURIComponent(model)}` +
    `&repair_type=${encodeURIComponent(repair)}` +
    `&quality=${encodeURIComponent(quality)}` +
    `&options=${encodeURIComponent(selectedOptions)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    resultArea.innerHTML = `<h2>見積もり結果</h2><p>${data.error}</p>`;
    return;
  }

  let html = `
    <h2>見積もり結果</h2>
    <p><strong>機種:</strong> ${data.model}</p>
    <p><strong>故障内容:</strong> ${data.repair_type}</p>
    <p><strong>品質ランク:</strong> ${data.quality}</p>
    <p><strong>基本料金:</strong> ¥${data.base_price.toLocaleString()}</p>
  `;

  if (data.options && data.options.length > 0) {
    html += `<p><strong>オプション:</strong></p><ul>`;
    data.options.forEach(opt => {
      html += `<li>${opt.name}：¥${opt.price.toLocaleString()}</li>`;
    });
    html += `</ul>`;
  }

  html += `<p><strong>合計:</strong> <span style="font-size:1.2em;">¥${data.total.toLocaleString()}</span></p>`;

  resultArea.innerHTML = html;
}

/* ============================================================
   ガラスコーティング
============================================================ */
async function calcGlassCoating() {
  const countEl = document.getElementById("glass-count");
  const typeEl = document.getElementById("glass-type");
  const personEl = document.getElementById("glass-person");
  const resultEl = document.getElementById("glass-result");

  if (!countEl || !typeEl || !personEl || !resultEl) return;

  const count = Number(countEl.value);
  const type = typeEl.value;
  const person = personEl.value;

  const params = new URLSearchParams({ count, type, person });

  const res = await fetch(`${API_BASE}/coating/glass?${params.toString()}`);
  const data = await res.json();

  resultEl.innerHTML = `
    <h2>ガラスコーティング見積もり</h2>
    <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
    <p><strong>合計：¥${data.total.toLocaleString()}</strong></p>
  `;
}

/* ============================================================
   セラミックコーティング
============================================================ */
async function calcCeramicCoating() {
  const countEl = document.getElementById("ceramic-count");
  const typeEl = document.getElementById("ceramic-type");
  const personEl = document.getElementById("ceramic-person");
  const resultEl = document.getElementById("ceramic-result");

  if (!countEl || !typeEl || !personEl || !resultEl) return;

  const count = Number(countEl.value);
  const type = typeEl.value;
  const person = personEl.value;

  const params = new URLSearchParams({ count, type, person });

  const res = await fetch(`${API_BASE}/coating/ceramic?${params.toString()}`);
  const data = await res.json();

  resultEl.innerHTML = `
    <h2>セラミックコーティング見積もり</h2>
    <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
    <p><strong>合計：¥${data.total.toLocaleString()}</strong></p>
  `;
}

/* ============================================================
   セット割アコーディオン（スムーズ開閉版）
============================================================ */
function setupAccordions() {
  const glassHeader = document.querySelector("#coat-glass .accordion-header");
  const glassList = document.getElementById("price-rules-glass");
  const glassIcon = document.getElementById("accordion-icon-glass");

  if (glassHeader && glassList && glassIcon) {
    glassHeader.addEventListener("click", () => {
      toggleAccordion(glassList, glassIcon);
    });
  }

  const ceramicHeader = document.querySelector("#coat-ceramic .accordion-header");
  const ceramicList = document.getElementById("price-rules-ceramic");
  const ceramicIcon = document.getElementById("accordion-icon-ceramic");

  if (ceramicHeader && ceramicList && ceramicIcon) {
    ceramicHeader.addEventListener("click", () => {
      toggleAccordion(ceramicList, ceramicIcon);
    });
  }
}

function toggleAccordion(listEl, iconEl) {
  const isOpen = listEl.classList.contains("open");
  if (isOpen) {
    listEl.classList.remove("open");
    iconEl.style.transform = "rotate(0deg)";
  } else {
    listEl.classList.add("open");
    iconEl.style.transform = "rotate(180deg)";
  }
}


/* ============================================================
   ICS → 1か月タイムライン（Instagram対応・完全版／修正版）
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const timelineEl = document.getElementById("calendar-timeline");
  if (!timelineEl) return;

  // ★ ここを GAS の URL に変更（文字列で渡す）
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbz90K4zuxXzS_LM24sMx5-Dc_I7BhKomfF1YRJTS8uXSLnZXugRd-lx1GLL2PrTCA/exec";

fetch(GAS_URL)
  .then(res => res.json())   // JSON として受け取る
  .then(events => {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const filtered = events.filter(
      ev => new Date(ev.start) >= startOfDay(now) &&
            new Date(ev.start) <= oneMonthLater
    );

    const grouped = groupByDate(
      filtered.map(ev => ({
        start: new Date(ev.start),
        end: new Date(ev.end),
        summary: ev.summary
      }))
    );

    renderTimeline(grouped, timelineEl);
  })

    .catch(err => {
      console.error(err);
      timelineEl.innerHTML = "<p>カレンダーの読み込みに失敗しました。</p>";
    });
});


/* ============================================================
   ICS を取得（改行・折り返し対応）
============================================================ */
async function fetchICS(url) {
  const res = await fetch(url + "?nocache=" + Math.random());
  return await res.text();
}

/* ============================================================
   ICS 行の折り返しを完全に結合（folding対応）
============================================================ */
function unfoldICS(text) {
  const lines = text.split(/\r?\n/);
  const unfolded = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 次の行がスペース or タブで始まる → 折り返し行
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      line += lines[i + 1].slice(1); // 先頭のスペースを除いて結合
      i++;
    }

    unfolded.push(line);
  }

  return unfolded.join("\n");
}

/* ============================================================
   ICS パーサー（折り返し行 / 改行 / 日本時間対応）
============================================================ */
function parseICS(text) {
  // 折り返し行を完全に結合
  text = unfoldICS(text);

  const lines = text.split(/\r?\n/);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT") {
      if (current.start && current.end) events.push(current);
      current = null;
    } else if (current) {
      if (line.startsWith("DTSTART")) {
        current.start = parseICSDate(line.split(":")[1]);
      } else if (line.startsWith("DTEND")) {
        current.end = parseICSDate(line.split(":")[1]);
      } else if (line.startsWith("SUMMARY")) {
        current.summary = decodeICS(line.split(":").slice(1).join(":"));
      }
    }
  }

  return events;
}

function parseICSDate(v) {
  const m = v.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/
  );
  if (!m) return new Date();

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);

  if (m[7] === "Z") {
    // UTC → 日本時間
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  } else {
    return new Date(year, month, day, hour, min, sec);
  }
}

function decodeICS(str) {
  return str
    .replace(/\\,/g, ",")
    .replace(/\\n/g, "\n")
    .replace(/\\;/g, ";");
}

/* ============================================================
   日付ごとにグループ化
============================================================ */
function groupByDate(events) {
  const map = {};

  events.forEach(ev => {
    const key = formatDateKey(ev.start);
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  });

  Object.keys(map).forEach(key => {
    map[key].sort((a, b) => a.start - b.start);
  });

  return map;
}

/* ============================================================
   タイムライン描画（1か月分）
============================================================ */
function renderTimeline(grouped, el) {
  el.innerHTML = "";

  const keys = Object.keys(grouped).sort();
  if (keys.length === 0) {
    el.innerHTML = "<p>今後1か月の予約は登録されていません。</p>";
    return;
  }

  keys.forEach(key => {
    const dayBox = document.createElement("div");
    dayBox.className = "calendar-day";

    const title = document.createElement("div");
    title.className = "calendar-day-title";
    title.textContent = formatDateLabel(key);
    dayBox.appendChild(title);

    const date = new Date(key);
    const slots = generateThreeHourSlots(date);

    slots.forEach(slot => {
      const status = getSlotStatus(slot, grouped[key]);

      const slotEl = document.createElement("div");
      slotEl.className = "calendar-slot " + status;

      const time = document.createElement("div");
      time.className = "calendar-slot-time";
      time.textContent = `${formatTime(slot.start)} 〜 ${formatTime(slot.end)}`;

      const label = document.createElement("div");
      label.className = "calendar-slot-label";
      label.textContent = status === "busy" ? "予約あり" : "空き";

      slotEl.appendChild(time);
      slotEl.appendChild(label);
      dayBox.appendChild(slotEl);
    });

    el.appendChild(dayBox);
  });
}


/* ============================================================
   日付・時間フォーマット
============================================================ */
function startOfDay(d) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return `${m}/${d}（${w}）`;
}

function formatTime(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
