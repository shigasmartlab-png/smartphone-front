/* ============================================================
   初期セットアップ
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
  setupCoatTabs();
  setupOsSwitch();
  setupAccordions();
　setupTravelOptions();
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
   出張対応エリア（片道距離 + 追加料金）
============================================================ */
const areas = {
  "湖南市": { distance: 13.5 },
  "日野町": { distance: 15.5 },
  "竜王町": { distance: 20 },
  "守山市": { distance: 25 },
  "草津市": { distance: 27.5 },
  "栗東市": { distance: 23 },
  "野洲市": { distance: 23.5 },
  "東近江市": { distance: 27 },
  "近江八幡市": { distance: 28 },
  "愛荘町": { distance: 35 },
  "大津市南部（瀬田周辺）": { distance: 30 },
  "大津市北部（堅田周辺）": { distance: 37, extra: 150 },
  "大津市中部（市街地）": { distance: 39 },
  "甲良町": { distance: 38.5 },
  "豊郷町": { distance: 39 },
  "多賀町": { distance: 40 },
  "彦根市": { distance: 48 },
  "米原市": { distance: 55 },
  "長浜市": { distance: 62 },
  "高島市": { distance: 70, extra: 150 }
};

/* ============================================================
   出張費計算
   出張費 = ((片道距離×2)/14km) × ガソリン単価 + extra
============================================================ */
function calcTravelFee(areaName, gasPrice = 170) {
  const area = areas[areaName];
  if (!area) return 0;

  const distance = area.distance;
  const roundTrip = distance * 2;

  const fuel = roundTrip / 14; // 燃費 14km/L
  let fee = fuel * gasPrice;

  if (area.extra) fee += area.extra;

  return Math.round(fee);
}

/* ============================================================
   出張対応 UI（チェックで地域プルダウン表示）
============================================================ */
function setupTravelOptions() {
  const travelCheck = document.getElementById("travel-check");
  const travelArea = document.getElementById("travel-area");

  if (!travelCheck || !travelArea) return;

  travelCheck.addEventListener("change", () => {
    travelArea.style.display = travelCheck.checked ? "block" : "none";
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

/* ▼ 出張費の取得 */
const travelCheck = document.getElementById("travel-check");
const travelArea = document.getElementById("travel-area");

let travelFee = 0;
if (travelCheck && travelCheck.checked && travelArea && travelArea.value) {
  travelFee = calcTravelFee(travelArea.value);
}

/* ▼ 合計に出張費を加算 */
const finalTotal = data.total + travelFee;

html += `<p><strong>出張費:</strong> ¥${travelFee.toLocaleString()}</p>`;
html += `<p><strong>合計:</strong> <span style="font-size:1.2em;">¥${finalTotal.toLocaleString()}</span></p>`;

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

/* ▼ 出張費 */
const travelCheck = document.getElementById("travel-check");
const travelArea = document.getElementById("travel-area");

let travelFee = 0;
if (travelCheck && travelCheck.checked && travelArea && travelArea.value) {
  travelFee = calcTravelFee(travelArea.value);
}

const finalTotal = data.total + travelFee;

resultEl.innerHTML = `
  <h2>ガラスコーティング見積もり</h2>
  <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
  <p>出張費：¥${travelFee.toLocaleString()}</p>
  <p><strong>合計：¥${finalTotal.toLocaleString()}</strong></p>
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

/* ▼ 出張費 */
const travelCheck = document.getElementById("travel-check");
const travelArea = document.getElementById("travel-area");

let travelFee = 0;
if (travelCheck && travelCheck.checked && travelArea && travelArea.value) {
  travelFee = calcTravelFee(travelArea.value);
}

const finalTotal = data.total + travelFee;

resultEl.innerHTML = `
  <h2>セラミックコーティング見積もり</h2>
  <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
  <p>出張費：¥${travelFee.toLocaleString()}</p>
  <p><strong>合計：¥${finalTotal.toLocaleString()}</strong></p>
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
   ICS → 1か月タイムライン（Instagram対応・完全版）
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const timelineEl = document.getElementById("calendar-timeline");
  const reloadBtn = document.getElementById("calendar-reload");
  if (!timelineEl) return;

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbz90K4zuxXzS_LM24sMx5-Dc_I7BhKomfF1YRJTS8uXSLnZXugRd-lx1GLL2PrTCA/exec";

  /* ------------------------------
      カレンダー読み込み処理
  ------------------------------ */
  function loadCalendar() {
    timelineEl.innerHTML = "<p>読み込み中...</p>";

    fetch(GAS_URL)
      .then(res => res.json())
      .then(events => {
        const now = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        // 期間内の予定だけ抽出
        const filtered = events.filter(ev => {
          const st = new Date(ev.start);
          return st >= startOfDay(now) && st <= oneMonthLater;
        });

        // 日付ごとにグループ化
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
  }

  // 初回読み込み
  loadCalendar();

  // 再読み込みボタン
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      loadCalendar();
    });
  }
});

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

  return map;
}

/* ============================================================
   3時間枠生成
============================================================ */
function generateThreeHourSlots(date, openHour = 10, closeHour = 19) {
  const slots = [];
  for (let h = openHour; h < closeHour; h += 3) {
    const start = new Date(date);
    start.setHours(h, 0, 0, 0);

    const end = new Date(date);
    end.setHours(Math.min(h + 3, closeHour), 0, 0, 0);

    slots.push({ start, end });
  }
  return slots;
}

/* ============================================================
   予約/空き判定
============================================================ */
function classifyEvent(ev) {
  const s = ev.summary || "";

  // 空き扱いにしたいキーワード
  if (s.includes("〇")) return "free";
  if (s.includes("要相談")) return "free";

  // それ以外は予約扱い
  return "busy";
}


/* ============================================================
   枠と予定の重なり判定
============================================================ */
function getSlotStatus(slot, events) {
  const overlapped = events.filter(ev =>
    ev.start < slot.end && ev.end > slot.start
  );

  if (overlapped.length === 0) return "free";

  if (overlapped.some(ev => classifyEvent(ev) === "busy")) {
    return "busy";
  }

  return "free";
}

/* ============================================================
   タイムライン描画（3時間枠対応）
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
