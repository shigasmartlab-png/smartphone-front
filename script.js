/* =========================
   メインタブ切り替え
========================= */
document.querySelectorAll(".main-tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".main-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.getElementById(`tab-${tab}`).classList.add("active");
  };
});

/* =========================
   API ベース URL（統合版）
========================= */
const API_BASE = "https://estimate-api-6j8x.onrender.com";

/* =========================
   品質ランク説明文
========================= */
const QUALITY_DESCRIPTIONS = {
  "互換品（LCD）": "純正ではない液晶パネル。価格が安いが、発色や明るさは純正より劣る場合があります。",
  "互換品（OLED）": "純正ではないOLEDパネル。純正に近い発色でコスパが良いタイプ。",
  "再生品（純正同等）": "純正パネルを再利用した高品質パネル。純正とほぼ同等の表示品質。",
  "標準": "バッテリー交換などで使用する標準品質のパーツです。"
};

/* =========================
   OS 切り替え
========================= */
let currentOS = "iPhone";

document.getElementById("btn-iphone").onclick = () => switchOS("iPhone");
document.getElementById("btn-android").onclick = () => switchOS("Android");

function switchOS(os) {
  currentOS = os;

  document.getElementById("btn-iphone").classList.toggle("active", os === "iPhone");
  document.getElementById("btn-android").classList.toggle("active", os === "Android");

  loadModels();
  loadOptions();
}

/* =========================
   初期ロード
========================= */
window.onload = async () => {
  await loadModels();
  await loadOptions();
};

/* =========================
   機種一覧
========================= */
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

/* =========================
   故障内容 + 品質ランク
========================= */
async function loadRepairs() {
  const model = document.getElementById("model").value;

  const res = await fetch(`${API_BASE}/repairs?model=${encodeURIComponent(model)}`);
  const data = await res.json();

  const repairSelect = document.getElementById("repair_type");
  const qualitySelect = document.getElementById("quality");
  repairSelect.innerHTML = "";
  qualitySelect.innerHTML = "";

  // 修理内容ごとに品質ランクをグループ化
  const grouped = {};
  (data.repairs || []).forEach(r => {
    if (!grouped[r.name]) grouped[r.name] = [];
    grouped[r.name].push({
      quality: r.quality,
      status: r.status
    });
  });

  // 修理内容セレクト
  Object.keys(grouped).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    repairSelect.appendChild(opt);
  });

  // 修理内容変更時に品質ランクを更新
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

  // ★ 品質ランク説明文を更新
  updateQualityDescription();

  // ★ 品質ランク変更時にも説明文を更新
  qualitySelect.onchange = updateQualityDescription;
}

/* =========================
   品質ランク説明文の更新
========================= */
function updateQualityDescription() {
  const q = document.getElementById("quality").value;
  const desc = QUALITY_DESCRIPTIONS[q] || "";
  document.getElementById("quality-description").textContent = desc;
}

/* =========================
   オプション一覧
========================= */
async function loadOptions() {
  const res = await fetch(`${API_BASE}/options`);
  const data = await res.json();

  const area = document.getElementById("options-area");
  area.innerHTML = "";

  (data.options || []).forEach(opt => {
    const div = document.createElement("div");
    div.className = "option-item";

    div.innerHTML = `
      <label>
        <input type="checkbox" value="${opt["オプション名"]}">
        <span>${opt["オプション名"]}（¥${opt["料金"].toLocaleString()}）</span>
      </label>
    `;

    area.appendChild(div);
  });
}

/* =========================
   修理見積もり
========================= */
async function estimate() {
  const model = document.getElementById("model").value;
  const repair = document.getElementById("repair_type").value;
  const quality = document.getElementById("quality").value;

  const selectedOptions = [...document.querySelectorAll("#options-area input:checked")]
    .map(c => c.value)
    .join(",");

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

  let total = Math.ceil(data.total / 100) * 100;

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

  html += `<p><strong>合計:</strong> <span style="font-size:1.2em;">¥${total.toLocaleString()}</span></p>`;

  resultArea.innerHTML = html;
}

/* =========================
   コーティング料金（既存のまま）
========================= */
function calcCoating() {
  const count = Number(document.getElementById("coat-count").value);
  const type = document.getElementById("coat-type").value;
  const person = document.getElementById("coat-person").value;
  const area = document.getElementById("coat-result");

  if (count <= 0) {
    area.innerHTML = `<p>1台以上を入力してください。</p>`;
    return;
  }

  let total = 0;
  let unit = 0;

  if (person === "student" || person === "senior") {
    unit = 2000;
    total = count * unit;
  } else {
    if (count === 1) total = 3300;
    else if (count === 2) total = 5800;
    else if (count === 3) total = 8000;
    else if (count >= 4 && count < 10) total = count * 2500;
    else if (count >= 10) total = count * 2200;

    if (type === "double") total *= 2;

    unit = Math.round(total / count);
  }

  area.innerHTML = `
    <h2>コーティング料金</h2>
    <p><strong>台数:</strong> ${count}台</p>
    <p><strong>タイプ:</strong> ${type === "single" ? "片面" : "両面"}</p>
    <p><strong>対象者:</strong> ${
      person === "normal" ? "一般" : person === "student" ? "学生" : "シニア"
    }</p>
    <p><strong>1台あたり:</strong> ¥${unit.toLocaleString()}</p>
    <p><strong>合計:</strong> <span style="font-size:1.2em;">¥${total.toLocaleString()}</span></p>
  `;
}

function togglePriceRules() {
  const rules = document.getElementById("price-rules");
  const icon = document.getElementById("accordion-icon");

  const isHidden = rules.classList.contains("hidden");

  if (isHidden) {
    rules.classList.remove("hidden");
    icon.style.transform = "rotate(180deg)";
  } else {
    rules.classList.add("hidden");
    icon.style.transform = "rotate(0deg)";
  }
}
