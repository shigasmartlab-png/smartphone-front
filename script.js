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
   OS 切り替え
============================================================ */
let currentOS = "iPhone";

document.getElementById("btn-iphone").onclick = () => switchOS("iPhone");
document.getElementById("btn-android").onclick = () => switchOS("Android");

function switchOS(os) {
  currentOS = os;

  document.getElementById("btn-iphone").classList.toggle("active", os === "iPhone");
  document.getElementById("btn-android").classList.toggle("active", os === "Android");

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
  const model = document.getElementById("model").value;

  const res = await fetch(`${API_BASE}/repairs?model=${encodeURIComponent(model)}`);
  const data = await res.json();

  const repairSelect = document.getElementById("repair_type");
  const qualitySelect = document.getElementById("quality");
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
  const repair = document.getElementById("repair_type").value;
  const qualitySelect = document.getElementById("quality");
  qualitySelect.innerHTML = "";

  grouped[repair].forEach(item => {
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
  const q = document.getElementById("quality").value;
  const desc = QUALITY_DESCRIPTIONS[q] || "";
  document.getElementById("quality-description").textContent = desc;
}

/* ============================================================
   修理タブ：オプション（バッテリー大容量化 + コーティング）
============================================================ */
function getSelectedOptions() {
  const options = [];

  const battery = document.getElementById("opt-battery");
  if (battery && battery.checked) {
    options.push("バッテリー大容量化");
  }

  const coating = document.getElementById("opt-coating").value;
  if (coating) {
    options.push(coating);
  }

  return options;
}

/* ============================================================
   修理見積もり
============================================================ */
async function estimate() {
  const model = document.getElementById("model").value;
  const repair = document.getElementById("repair_type").value;
  const quality = document.getElementById("quality").value;

  const selectedOptions = getSelectedOptions().join(",");

  const url =
    `${API_BASE}/estimate?model=${encodeURIComponent(model)}` +
    `&repair_type=${encodeURIComponent(repair)}` +
    `&quality=${encodeURIComponent(quality)}` +
    `&options=${encodeURIComponent(selectedOptions)}`;

  const res = await fetch(url);
  const data = await res.json();

  const resultArea = document.getElementById("result");

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

  if (data.options.length > 0) {
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
   コーティングタブ：サブタブ切り替え
============================================================ */
document.querySelectorAll(".coat-tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".coat-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.coat;

    document.querySelectorAll(".coat-content").forEach(c => c.classList.remove("active"));
    document.getElementById(`coat-${tab}`).classList.add("active");
  };
});

/* ============================================================
   ガラスコーティング
============================================================ */
async function calcGlassCoating() {
  const count = Number(document.getElementById("glass-count").value);
  const type = document.getElementById("glass-type").value;
  const person = document.getElementById("glass-person").value;

  const params = new URLSearchParams({ count, type, person });

  const res = await fetch(`${API_BASE}/coating/glass?${params.toString()}`);
  const data = await res.json();

  document.getElementById("glass-result").innerHTML = `
    <h2>ガラスコーティング見積もり</h2>
    <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
    <p><strong>合計：¥${data.total.toLocaleString()}</strong></p>
  `;
}

/* ============================================================
   セラミックコーティング
============================================================ */
async function calcCeramicCoating() {
  const count = Number(document.getElementById("ceramic-count").value);
  const type = document.getElementById("ceramic-type").value;
  const person = document.getElementById("ceramic-person").value;

  const params = new URLSearchParams({ count, type, person });

  const res = await fetch(`${API_BASE}/coating/ceramic?${params.toString()}`);
  const data = await res.json();

  document.getElementById("ceramic-result").innerHTML = `
    <h2>セラミックコーティング見積もり</h2>
    <p>1台あたり：¥${data.price_per_unit.toLocaleString()}</p>
    <p><strong>合計：¥${data.total.toLocaleString()}</strong></p>
  `;
}
