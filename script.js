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
const API_URLS = {
  iphone: "https://iphone-estimate-api.onrender.com",
  android: "https://android-estimate-api.onrender.com"
};

let currentOS = "iphone";
let API_BASE = API_URLS[currentOS];

document.getElementById("btn-iphone").onclick = () => switchOS("iphone");
document.getElementById("btn-android").onclick = () => switchOS("android");

function switchOS(os) {
  currentOS = os;
  API_BASE = API_URLS[os];

  document.getElementById("btn-iphone").classList.toggle("active", os === "iphone");
  document.getElementById("btn-android").classList.toggle("active", os === "android");

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
  const res = await fetch(`${API_BASE}/models`);
  const data = await res.json();

  const modelSelect = document.getElementById("model");
  modelSelect.innerHTML = "";

  data.models.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSelect.appendChild(opt);
  });

  modelSelect.onchange = loadRepairs;
  await loadRepairs();
}

/* =========================
   故障内容一覧
========================= */
async function loadRepairs() {
  const model = document.getElementById("model").value;

  const res = await fetch(`${API_BASE}/repairs?model=${encodeURIComponent(model)}`);
  const data = await res.json();

  const repairSelect = document.getElementById("repair_type");
  repairSelect.innerHTML = "";

  let availableCount = 0;

  data.repairs.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.name;

    if (r.status === "available") {
      opt.textContent = r.name;
      availableCount++;
    } else if (r.status === "soldout") {
      opt.textContent = `${r.name}（SOLD OUT）`;
      opt.disabled = true;
    } else if (r.status === "unsupported") {
      opt.textContent = `${r.name}（未対応）`;
      opt.disabled = true;
    }

    repairSelect.appendChild(opt);
  });

  repairSelect.disabled = availableCount === 0;
}

/* =========================
   オプション一覧
========================= */
async function loadOptions() {
  const res = await fetch(`${API_BASE}/options`);
  const data = await res.json();

  const area = document.getElementById("options-area");
  area.innerHTML = "";

  data.options.forEach(opt => {
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

  const selectedOptions = [...document.querySelectorAll("#options-area input:checked")]
    .map(c => c.value)
    .join(",");

  const url = `${API_BASE}/estimate?model=${encodeURIComponent(model)}&repair_type=${encodeURIComponent(repair)}&options=${encodeURIComponent(selectedOptions)}`;

  const res = await fetch(url);
  const data = await res.json();

  const resultArea = document.getElementById("result");

  if (data.error) {
    if (data.error === "未対応") {
      resultArea.innerHTML = `<h2>見積もり結果</h2><p>この修理は未対応です。</p>`;
      return;
    }
    if (data.error === "SOLD OUT") {
      resultArea.innerHTML = `<h2>見積もり結果</h2><p>在庫切れ（SOLD OUT）のため対応できません。</p>`;
      return;
    }
    resultArea.innerHTML = `<h2>見積もり結果</h2><p>エラーが発生しました。</p>`;
    return;
  }

  let total = Math.ceil(data.total / 100) * 100;

  let html = `
    <h2>見積もり結果</h2>
    <p><strong>機種:</strong> ${data.model}</p>
    <p><strong>故障内容:</strong> ${data.repair_type}</p>
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
   コーティング料金（片面 / 両面）
========================= */
function calcCoating() {
  const count = Number(document.getElementById("coat-count").value);
  const type = document.getElementById("coat-type").value;
  const area = document.getElementById("coat-result");

  if (count <= 0) {
    area.innerHTML = `<p>1台以上を入力してください。</p>`;
    return;
  }

  let base = 0;

  if (count === 1) base = 3300;
  else if (count === 2) base = 5800;
  else if (count === 3) base = 8000;
  else if (count >= 4 && count < 10) base = count * 2500;
  else if (count >= 10) base = count * 2200;

  if (type === "double") base *= 2;

  area.innerHTML = `
    <h2>コーティング料金</h2>
    <p><strong>台数:</strong> ${count}台</p>
    <p><strong>タイプ:</strong> ${type === "single" ? "片面" : "両面"}</p>
    <p><strong>合計:</strong> ¥${base.toLocaleString()}</p>
  `;
}
