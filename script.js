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
   OS 切り替え
========================= */
const API_BASE = "https://estimate-api-6j8x.onrender.com";

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

  // 修理内容セレクトを作成
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
