/* ==========================================
   Shiga Smart Lab Estimate Simulator
========================================== */

const API_BASE = "https://estimate-api-6j8x.onrender.com";

const AVAILABILITY_API =
  "https://script.google.com/macros/s/AKfycbxKAidOMkH2exn1zeUyIdueegpAdc50i3VSLnprFzKMiERJQWkoVXvQhx1n4pliVFF0/exec";

const RESERVATION_AVAILABILITY_API =
  "https://script.google.com/macros/s/AKfycbxlIKZWy_OKCF-mL147Es-DkXyUvci8MAbpegWzyXxSyeokZuOG4MPZcxJr-7FE5p4n/exec";

// 新しい受付用Apps Scriptをデプロイ後、このURLへ差し替えます。
const INQUIRY_API =
  "https://script.google.com/macros/s/AKfycbw_AdoFDzksHv620EXNS7WajjrmfpMR_DNgJDzgP05TYNyhE9OnOKn9V7_raV-CCmMjcw/exec";

let currentOS = "iPhone";
let currentRepairs = [];
let batteryRepairs = [];
let selectedRepairItem = null;
let lastEstimateContext = null;


/* ==========================================
   出張設定
========================================== */

const areas = {
  "湖南市": { distance: 15, extra: 0 },
  "日野町": { distance: 22, extra: 0 },
  "竜王町": { distance: 28, extra: 0 },
  "守山市": { distance: 35, extra: 0 },
  "草津市": { distance: 35, extra: 0 },
  "栗東市": { distance: 30, extra: 0 },
  "野洲市": { distance: 35, extra: 0 },
  "東近江市": { distance: 35, extra: 0 },
  "近江八幡市": { distance: 40, extra: 0 },
  "愛荘町": { distance: 50, extra: 0 },
  "大津市南部（瀬田周辺）": { distance: 45, extra: 0 },
  "大津市中部（市街地）": { distance: 55, extra: 0 },
  "大津市北部（堅田周辺）": { distance: 70, extra: 0 },
  "甲良町": { distance: 55, extra: 0 },
  "豊郷町": { distance: 60, extra: 0 },
  "多賀町": { distance: 60, extra: 0 },
  "彦根市": { distance: 65, extra: 0 },
  "米原市": { distance: 80, extra: 0 },
  "長浜市": { distance: 95, extra: 0 },
  "高島市": { distance: 100, extra: 0 }
};

const GAS_PRICE = 180;
const FUEL_ECONOMY = 14;

function calculateTravelFee(areaName) {
  const area = areas[areaName];

  if (!area) return 0;

  const roundTrip = area.distance * 2;
  const fuelCost = (roundTrip / FUEL_ECONOMY) * GAS_PRICE;

  return Math.ceil((fuelCost + area.extra) / 100) * 100;
}


/* ==========================================
   初期化
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
  setupOsSwitch();
  setupCoatingTabs();
  setupAccordions();
  setupTravelOptions();
  setupButtons();
  setupBatterySelectors();
  setupReservationForm();
  loadModels();
});


/* ==========================================
   メインタブ
========================================== */

function setupMainTabs() {
  const buttons = document.querySelectorAll(".main-tab");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.tab;

      buttons.forEach(btn => btn.classList.remove("active"));

      document
        .querySelectorAll(".tab-content")
        .forEach(content => content.classList.remove("active"));

      button.classList.add("active");

      const target = document.getElementById(`tab-${tabName}`);

      if (target) {
        target.classList.add("active");
      }

      if (tabName === "calendar") {
        loadAvailability();
      }
    });
  });
}


/* ==========================================
   OS
========================================== */

function setupOsSwitch() {
  const iphone = document.getElementById("btn-iphone");
  const android = document.getElementById("btn-android");

  iphone.addEventListener("click", () => {
    if (currentOS === "iPhone") return;

    currentOS = "iPhone";

    iphone.classList.add("active");
    android.classList.remove("active");

    loadModels();
  });

  android.addEventListener("click", () => {
    if (currentOS === "Android") return;

    currentOS = "Android";

    android.classList.add("active");
    iphone.classList.remove("active");

    loadModels();
  });
}


/* ==========================================
   機種
========================================== */

async function loadModels() {
  const model = document.getElementById("model");
  const repair = document.getElementById("repair_type");
  const button = document.getElementById("repair-estimate-btn");
  const detail = document.getElementById("repair-detail");

  currentRepairs = [];
  batteryRepairs = [];
  selectedRepairItem = null;
  resetBatterySelectors();

  model.disabled = true;
  repair.disabled = true;
  button.disabled = true;

  detail.classList.add("hidden");
  document.getElementById("result").replaceChildren();

  setSelectMessage(model, "価格データを読み込んでいます...");
  setSelectMessage(repair, "先に機種を選択してください");

  try {
    const response = await fetch(
      `${API_BASE}/models?os=${encodeURIComponent(currentOS)}`
    );

    if (!response.ok) {
      throw new Error("機種データを取得できませんでした");
    }

    const data = await response.json();

    const models = Array.isArray(data)
      ? data
      : Array.isArray(data.models)
        ? data.models
        : [];

    model.replaceChildren();

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "機種を選択してください";
    model.appendChild(first);

    models.forEach(item => {
      const name =
        typeof item === "string"
          ? item
          : item.model || item.name || "";

      if (!name) return;

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;

      model.appendChild(option);
    });

    model.disabled = false;

  } catch (error) {
    console.error(error);

    setSelectMessage(
      model,
      "読み込みに失敗しました。時間をおいて再度お試しください"
    );
  }

  model.onchange = loadRepairs;
}

function setSelectMessage(select, message) {
  select.replaceChildren();

  const option = document.createElement("option");
  option.value = "";
  option.textContent = message;

  select.appendChild(option);
}


/* ==========================================
   修理一覧
========================================== */

function isBatteryRepair(item) {
  if (!item) return false;

  const text = [
    item.name || "",
    item.category || "",
    item.part || ""
  ].join(" ");

  return text.includes("バッテリー");
}

function getBatteryType(item) {
  const quality = String(item?.quality || "").trim();

  return quality
    .replace(/・大容量/g, "")
    .trim() || "通常";
}

function getBatteryCapacity(item) {
  return String(item?.quality || "").includes("大容量")
    ? "large"
    : "standard";
}

function getBatteryCapacityLabel(capacity) {
  return capacity === "large"
    ? "大容量"
    : "標準容量";
}

function getBatteryTypeDescription(type) {
  const descriptions = {
    "通常":
      "価格を抑えたい方向けの標準タイプです。普段使いにおすすめです。",
    "高品質":
      "セル品質や安定性を重視したタイプです。長く使いたい方や、品質を重視したい方におすすめです。",
    "TIチップ搭載":
      "TIチップを搭載した高品質タイプです。交換後のバッテリー情報表示にも配慮した設計です。機種やiOSの仕様により、「バッテリーに関する重要なメッセージ」や「未確認」などの表示が残る場合がありますが、通常の使用には問題ありません。"
  };

  return descriptions[type] ||
    "バッテリーの種類によって、価格・仕様・特徴が異なります。";
}

function updateBatteryTypeDescription(type = "") {
  const description =
    document.getElementById("battery-type-description");

  if (!description) return;

  if (!type) {
    description.replaceChildren();
    description.classList.add("hidden");
    return;
  }

  const title = document.createElement("strong");
  title.textContent = "このバッテリーについて";

  const text = document.createElement("p");
  text.textContent = getBatteryTypeDescription(type);

  description.replaceChildren(title, text);
  description.classList.remove("hidden");
}

function setupBatterySelectors() {
  const typeSelect =
    document.getElementById("battery-type");
  const capacitySelect =
    document.getElementById("battery-capacity");

  if (typeSelect) {
    typeSelect.addEventListener(
      "change",
      handleBatteryTypeSelection
    );
  }

  if (capacitySelect) {
    capacitySelect.addEventListener(
      "change",
      handleBatteryCapacitySelection
    );
  }
}

function resetBatterySelectors() {
  const typeField =
    document.getElementById("battery-type-field");
  const capacityField =
    document.getElementById("battery-capacity-field");
  const typeSelect =
    document.getElementById("battery-type");
  const capacitySelect =
    document.getElementById("battery-capacity");

  if (typeField) {
    typeField.classList.add("hidden");
  }

  updateBatteryTypeDescription();

  if (capacityField) {
    capacityField.classList.add("hidden");
  }

  if (typeSelect) {
    setSelectMessage(
      typeSelect,
      "先にバッテリー交換を選択してください"
    );
    typeSelect.disabled = true;
  }

  if (capacitySelect) {
    setSelectMessage(
      capacitySelect,
      "先にバッテリー種類を選択してください"
    );
    capacitySelect.disabled = true;
  }
}

function populateBatteryTypes() {
  const field =
    document.getElementById("battery-type-field");
  const select =
    document.getElementById("battery-type");

  if (!field || !select) return;

  const order = [
    "通常",
    "高品質",
    "TIチップ搭載"
  ];

  const available = [
    ...new Set(
      batteryRepairs.map(getBatteryType)
    )
  ].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);

    if (ai === -1 && bi === -1) {
      return a.localeCompare(b, "ja");
    }

    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });

  select.replaceChildren();

  const first =
    document.createElement("option");
  first.value = "";
  first.textContent =
    "バッテリー種類を選択してください";
  select.appendChild(first);

  available.forEach(type => {
    const option =
      document.createElement("option");

    option.value = type;
    option.textContent = type;

    select.appendChild(option);
  });

  field.classList.remove("hidden");
  select.disabled = false;
}

function handleBatteryTypeSelection() {
  const typeSelect =
    document.getElementById("battery-type");
  const capacityField =
    document.getElementById("battery-capacity-field");
  const capacitySelect =
    document.getElementById("battery-capacity");
  const button =
    document.getElementById("repair-estimate-btn");
  const detail =
    document.getElementById("repair-detail");

  selectedRepairItem = null;
  button.disabled = true;
  detail.classList.add("hidden");
  updateBatteryTypeDescription(typeSelect?.value || "");
  document
    .getElementById("result")
    .replaceChildren();

  if (!typeSelect?.value) {
    capacityField?.classList.add("hidden");

    if (capacitySelect) {
      setSelectMessage(
        capacitySelect,
        "先にバッテリー種類を選択してください"
      );
      capacitySelect.disabled = true;
    }

    return;
  }

  const variants =
    batteryRepairs.filter(
      item =>
        getBatteryType(item) ===
        typeSelect.value
    );

  const capacities = [
    ...new Set(
      variants.map(getBatteryCapacity)
    )
  ];

  capacitySelect.replaceChildren();

  const first =
    document.createElement("option");
  first.value = "";
  first.textContent =
    "容量を選択してください";
  capacitySelect.appendChild(first);

  ["standard", "large"]
    .filter(capacity =>
      capacities.includes(capacity)
    )
    .forEach(capacity => {
      const variant =
        variants.find(
          item =>
            getBatteryCapacity(item) ===
            capacity
        );

      const option =
        document.createElement("option");

      option.value = capacity;
      option.textContent =
        `${getBatteryCapacityLabel(capacity)}　${formatYen(variant?.price)}`;

      capacitySelect.appendChild(option);
    });

  capacityField.classList.remove("hidden");
  capacitySelect.disabled = false;

  if (capacities.length === 1) {
    capacitySelect.value = capacities[0];
    handleBatteryCapacitySelection();
  }
}

function handleBatteryCapacitySelection() {
  const typeSelect =
    document.getElementById("battery-type");
  const capacitySelect =
    document.getElementById("battery-capacity");
  const button =
    document.getElementById("repair-estimate-btn");
  const detail =
    document.getElementById("repair-detail");

  selectedRepairItem = null;
  button.disabled = true;
  detail.classList.add("hidden");
  document
    .getElementById("result")
    .replaceChildren();

  if (
    !typeSelect?.value ||
    !capacitySelect?.value
  ) {
    return;
  }

  const item =
    batteryRepairs.find(
      candidate =>
        getBatteryType(candidate) ===
          typeSelect.value &&
        getBatteryCapacity(candidate) ===
          capacitySelect.value
    );

  if (!item) return;

  selectedRepairItem = item;
  renderRepairDetail(item);
  button.disabled = false;
}

function renderRepairDetail(item) {
  const detail =
    document.getElementById("repair-detail");

  detail.replaceChildren();

  const name =
    document.createElement("strong");

  name.textContent =
    item.name ||
    item.category ||
    "修理";

  const price =
    document.createElement("span");
  price.textContent =
    formatYen(item.price);

  detail.append(name, price);

  if (isBatteryRepair(item)) {
    const type =
      document.createElement("small");
    type.textContent =
      `種類：${getBatteryType(item)}`;
    detail.appendChild(type);

    const capacity =
      document.createElement("small");
    capacity.textContent =
      `容量：${getBatteryCapacityLabel(
        getBatteryCapacity(item)
      )}`;
    detail.appendChild(capacity);

  } else if (item.quality) {
    const quality =
      document.createElement("small");
    quality.textContent =
      `品質：${item.quality}`;
    detail.appendChild(quality);
  }

  if (item.note) {
    const note =
      document.createElement("small");
    note.textContent = item.note;
    detail.appendChild(note);
  }

  detail.classList.remove("hidden");
}

async function loadRepairs() {
  const modelName =
    document.getElementById("model").value;
  const repair =
    document.getElementById("repair_type");
  const button =
    document.getElementById(
      "repair-estimate-btn"
    );
  const detail =
    document.getElementById(
      "repair-detail"
    );

  currentRepairs = [];
  batteryRepairs = [];
  selectedRepairItem = null;
  resetBatterySelectors();

  repair.disabled = true;
  button.disabled = true;

  detail.classList.add("hidden");
  document
    .getElementById("result")
    .replaceChildren();

  if (!modelName) {
    setSelectMessage(
      repair,
      "先に機種を選択してください"
    );
    return;
  }

  setSelectMessage(
    repair,
    "修理メニューを読み込んでいます..."
  );

  try {
    const response = await fetch(
      `${API_BASE}/repairs?model=${encodeURIComponent(modelName)}`
    );

    if (!response.ok) {
      throw new Error(
        "修理データを取得できませんでした"
      );
    }

    const data = await response.json();

    currentRepairs = Array.isArray(data)
      ? data
      : Array.isArray(data.repairs)
        ? data.repairs
        : [];

    batteryRepairs =
      currentRepairs.filter(isBatteryRepair);

    repair.replaceChildren();

    const first =
      document.createElement("option");

    first.value = "";
    first.textContent =
      "修理内容を選択してください";

    repair.appendChild(first);

    let batteryAdded = false;

    currentRepairs.forEach(
      (item, index) => {
        if (isBatteryRepair(item)) {
          if (batteryAdded) return;

          const option =
            document.createElement("option");

          option.value = "battery";
          option.textContent =
            "バッテリー交換";

          repair.appendChild(option);
          batteryAdded = true;
          return;
        }

        const option =
          document.createElement("option");

        option.value =
          `item:${index}`;

        const name =
          item.name ||
          item.category ||
          item.part ||
          "修理";

        const quality =
          item.quality &&
          item.quality !== "標準"
            ? `｜${item.quality}`
            : "";

        option.textContent =
          `${name}${quality}　${formatYen(
            item.price
          )}`;

        repair.appendChild(option);
      }
    );

    repair.disabled = false;

    if (!currentRepairs.length) {
      setSelectMessage(
        repair,
        "現在公開中の修理価格がありません"
      );

      repair.disabled = true;
    }

  } catch (error) {
    console.error(error);

    setSelectMessage(
      repair,
      "読み込みに失敗しました"
    );
  }

  repair.onchange =
    handleRepairSelection;
}


/* ==========================================
   修理選択
========================================== */

function handleRepairSelection() {
  const select =
    document.getElementById("repair_type");
  const button =
    document.getElementById(
      "repair-estimate-btn"
    );
  const detail =
    document.getElementById(
      "repair-detail"
    );

  selectedRepairItem = null;
  resetBatterySelectors();

  document
    .getElementById("result")
    .replaceChildren();

  detail.classList.add("hidden");
  button.disabled = true;

  if (select.value === "") {
    return;
  }

  if (select.value === "battery") {
    populateBatteryTypes();
    return;
  }

  if (
    !select.value.startsWith("item:")
  ) {
    return;
  }

  const index =
    Number(select.value.split(":")[1]);

  const item =
    currentRepairs[index];

  if (!item) return;

  selectedRepairItem = item;
  renderRepairDetail(item);
  button.disabled = false;
}


/* ==========================================
   修理見積もり
========================================== */

function showRepairEstimate() {
  const repairSelect =
    document.getElementById(
      "repair_type"
    );

  if (
    repairSelect.value === "" ||
    !selectedRepairItem
  ) {
    return;
  }

  const item =
    selectedRepairItem;

  const modelName =
    document.getElementById(
      "model"
    ).value;

  const travelCheck =
    document.getElementById(
      "repair-travel-check"
    );

  const travelArea =
    document.getElementById(
      "repair-travel-area"
    );

  let travelFee = 0;

  if (travelCheck.checked) {
    if (!travelArea.value) {
      alert(
        "出張地域を選択してください"
      );
      return;
    }

    travelFee =
      calculateTravelFee(
        travelArea.value
      );
  }

  const repairPrice =
    Number(item.price) || 0;

  const total =
    repairPrice +
    travelFee;

  const repairRows = [
    ["機種", modelName],
    [
      "修理内容",
      item.name ||
      item.category ||
      "修理"
    ]
  ];

  if (isBatteryRepair(item)) {
    repairRows.push(
      [
        "バッテリー種類",
        getBatteryType(item)
      ],
      [
        "容量",
        getBatteryCapacityLabel(
          getBatteryCapacity(item)
        )
      ]
    );
  } else if (item.quality) {
    repairRows.push(
      ["品質", item.quality]
    );
  }

  repairRows.push(
    [
      "修理料金",
      formatYen(repairPrice)
    ]
  );

  if (travelFee) {
    repairRows.push(
      [
        "出張費",
        formatYen(travelFee)
      ]
    );
  }

  lastEstimateContext = {
    requestType: "repair",
    model: modelName,
    service: item.name || item.category || "修理",
    batteryType: isBatteryRepair(item) ? getBatteryType(item) : "",
    capacity: isBatteryRepair(item)
      ? getBatteryCapacityLabel(getBatteryCapacity(item))
      : "",
    coatingType: "",
    total,
    travel: travelCheck.checked,
    travelArea: travelCheck.checked ? travelArea.value : ""
  };

  renderResult(
    "result",
    repairRows,
    total
  );

  renderReservationCta("result");
}


/* ==========================================
   コーティングタブ
========================================== */

function setupCoatingTabs() {
  const buttons =
    document.querySelectorAll(".coat-btn");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.coat;

      buttons.forEach(btn =>
        btn.classList.remove("active")
      );

      document
        .querySelectorAll(".coat-content")
        .forEach(content =>
          content.classList.remove("active")
        );

      button.classList.add("active");

      const target =
        document.getElementById(`coat-${type}`);

      if (target) {
        target.classList.add("active");
      }
    });
  });
}


/* ==========================================
   アコーディオン
========================================== */

function setupAccordions() {
  document
    .querySelectorAll(".accordion-header")
    .forEach(button => {
      button.addEventListener("click", () => {
        const type =
          button.dataset.accordion;

        const list =
          document.getElementById(
            `price-rules-${type}`
          );

        if (!list) return;

        const open =
          list.classList.toggle("open");

        const icon =
          button.querySelector(
            "span:last-child"
          );

        if (icon) {
          icon.textContent =
            open ? "−" : "＋";
        }
      });
    });
}


/* ==========================================
   出張UI
========================================== */

function setupTravelOptions() {
  setupTravel(
    "repair-travel-check",
    "repair-travel-area"
  );

  setupTravel(
    "glass-travel-check",
    "glass-travel-area"
  );

  setupTravel(
    "ceramic-travel-check",
    "ceramic-travel-area"
  );
}

function setupTravel(checkId, areaId) {
  const check =
    document.getElementById(checkId);

  const select =
    document.getElementById(areaId);

  if (!check || !select) return;

  Object.keys(areas).forEach(areaName => {
    const option =
      document.createElement("option");

    option.value = areaName;
    option.textContent = areaName;

    select.appendChild(option);
  });

  check.addEventListener("change", () => {
    if (check.checked) {
      select.classList.remove("hidden");
    } else {
      select.classList.add("hidden");
      select.value = "";
    }
  });
}


/* ==========================================
   コーティング料金
========================================== */

async function calcGlassCoating() {
  await calculateCoating(
    "glass",
    "glass-count",
    "glass-type",
    "glass-person",
    "glass-travel-check",
    "glass-travel-area",
    "glass-result"
  );
}

async function calcCeramicCoating() {
  await calculateCoating(
    "ceramic",
    "ceramic-count",
    "ceramic-type",
    "ceramic-person",
    "ceramic-travel-check",
    "ceramic-travel-area",
    "ceramic-result"
  );
}

async function calculateCoating(
  kind,
  countId,
  typeId,
  personId,
  travelCheckId,
  travelAreaId,
  resultId
) {
  const count =
    Math.max(
      1,
      Number(
        document.getElementById(countId).value
      ) || 1
    );

  const type =
    document.getElementById(typeId).value;

  const person =
    document.getElementById(personId).value;

  const travelCheck =
    document.getElementById(
      travelCheckId
    );

  const travelArea =
    document.getElementById(
      travelAreaId
    );

  let travelFee = 0;

  if (travelCheck.checked) {
    if (!travelArea.value) {
      alert("出張地域を選択してください");
      return;
    }

    travelFee =
      calculateTravelFee(
        travelArea.value
      );
  }

  const button =
    kind === "glass"
      ? document.getElementById(
          "glass-calc-btn"
        )
      : document.getElementById(
          "ceramic-calc-btn"
        );

  const originalText =
    button.textContent;

  button.disabled = true;
  button.textContent = "計算中...";

  try {
    const params =
      new URLSearchParams({
        count: String(count),
        type,
        person
      });

    const response = await fetch(
      `${API_BASE}/coating/${kind}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        "料金を取得できませんでした"
      );
    }

    const data =
      await response.json();

    const coatingPrice =
      getPriceFromResponse(data);

    const total =
      coatingPrice + travelFee;

    lastEstimateContext = {
      requestType: "coating",
      model: "",
      service: kind === "glass"
        ? "抗菌ガラスコーティング"
        : "セラミックコーティング",
      batteryType: "",
      capacity: "",
      coatingType: `${type === "double" ? "両面" : "片面"} / ${count}台 / ${person === "student" ? "学生" : person === "senior" ? "シニア" : "一般"}`,
      total,
      travel: Boolean(travelCheck?.checked),
      travelArea: travelCheck?.checked ? travelArea?.value || "" : ""
    };

    renderResult(
      resultId,
      [
        ["台数", `${count}台`],

        [
          "施工面",
          type === "double"
            ? "両面"
            : "片面"
        ],

        [
          "対象",
          person === "student"
            ? "学生"
            : person === "senior"
              ? "シニア"
              : "一般"
        ],

        [
          "コーティング料金",
          formatYen(coatingPrice)
        ],

        ...(travelFee
          ? [[
              "出張費",
              formatYen(travelFee)
            ]]
          : [])
      ],

      total
    );

    renderReservationCta(resultId);

  } catch (error) {
    console.error(error);

    renderError(
      resultId,
      "料金の取得に失敗しました。時間をおいて再度お試しください。"
    );

  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function getPriceFromResponse(data) {
  if (typeof data === "number") {
    return data;
  }

  const candidates = [
    data.total,
    data.price,
    data.total_price,
    data.amount
  ];

  const value =
    candidates.find(
      item =>
        Number.isFinite(Number(item))
    );

  return Number(value) || 0;
}


/* ==========================================
   結果表示
========================================== */

function renderResult(
  targetId,
  rows,
  total
) {
  const target =
    document.getElementById(targetId);

  target.replaceChildren();

  const card =
    document.createElement("div");

  card.className = "result-card";

  const heading =
    document.createElement("span");

  heading.className = "result-label";
  heading.textContent = "お見積もり";

  card.appendChild(heading);

  rows.forEach(([label, value]) => {
    const row =
      document.createElement("div");

    row.className = "result-row";

    const left =
      document.createElement("span");

    left.textContent = label;

    const right =
      document.createElement("strong");

    right.textContent = value;

    row.append(left, right);
    card.appendChild(row);
  });

  const totalRow =
    document.createElement("div");

  totalRow.className = "result-total";

  const totalLabel =
    document.createElement("span");

  totalLabel.textContent = "合計";

  const totalPrice =
    document.createElement("strong");

  totalPrice.textContent =
    formatYen(total);

  totalRow.append(
    totalLabel,
    totalPrice
  );

  card.appendChild(totalRow);
  target.appendChild(card);
}

function renderError(
  targetId,
  message
) {
  const target =
    document.getElementById(targetId);

  target.replaceChildren();

  const box =
    document.createElement("div");

  box.className = "error-card";
  box.textContent = message;

  target.appendChild(box);
}


/* ==========================================
   予約・問い合わせ
========================================== */

function renderReservationCta(targetId) {
  const target = document.getElementById(targetId);
  if (!target || !lastEstimateContext) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-btn reservation-cta";
  button.textContent = "この内容で予約・問い合わせ";

  button.addEventListener("click", openReservationPanel);
  target.appendChild(button);
}

function setupReservationForm() {
  for (let i = 1; i <= 3; i++) {
    const dateInput = document.getElementById(`preferred-date-${i}`);
    if (!dateInput) continue;

    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    dateInput.min = formatDateInput(today);
    dateInput.max = formatDateInput(maxDate);
    dateInput.addEventListener("change", () => loadPreferredTimes(i));
  }

  const form = document.getElementById("reservation-form");
  if (form) {
    form.addEventListener("submit", submitReservationInquiry);
  }
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function openReservationPanel() {
  if (!lastEstimateContext) return;

  const panel = document.getElementById("reservation-panel");
  const summary = document.getElementById("reservation-summary");

  summary.replaceChildren();

  const title = document.createElement("strong");
  title.textContent = "現在のお見積もり";

  const service = document.createElement("p");
  const model = lastEstimateContext.model
    ? `${lastEstimateContext.model} / `
    : "";
  service.textContent = `${model}${lastEstimateContext.service}`;

  const total = document.createElement("p");
  total.className = "reservation-summary-total";
  total.textContent = `見積金額：${formatYen(lastEstimateContext.total)}`;

  summary.append(title, service, total);

  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadPreferredTimes(index) {
  const dateInput = document.getElementById(`preferred-date-${index}`);
  const timeSelect = document.getElementById(`preferred-time-${index}`);

  if (!dateInput?.value || !timeSelect) return;

  setSelectMessage(timeSelect, "空き時間を読み込んでいます...");
  timeSelect.disabled = true;

  try {
    const response = await fetch(
      `${RESERVATION_AVAILABILITY_API}?action=availability&date=${encodeURIComponent(dateInput.value)}&duration=60`
    );

    if (!response.ok) {
      throw new Error("availability error");
    }

    const data = await response.json();
    const slots = Array.isArray(data.slots) ? data.slots : [];

    timeSelect.replaceChildren();

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "時間を選択してください";
    timeSelect.appendChild(first);

    slots
      .filter(slot => slot && slot.available)
      .forEach(slot => {
        const option = document.createElement("option");
        option.value = slot.time;
        option.textContent = slot.time;
        timeSelect.appendChild(option);
      });

    if (timeSelect.options.length === 1) {
      first.textContent = "この日に選択できる時間はありません";
      timeSelect.disabled = true;
      return;
    }

    timeSelect.disabled = false;
  } catch (error) {
    console.error(error);
    setSelectMessage(timeSelect, "空き時間を取得できませんでした");
    timeSelect.disabled = true;
  }
}

function getPreferredSlots() {
  return [1, 2, 3].map(index => ({
    date: document.getElementById(`preferred-date-${index}`)?.value || "",
    time: document.getElementById(`preferred-time-${index}`)?.value || ""
  }));
}

function validatePreferredSlots(slots) {
  if (slots.some(slot => !slot.date || !slot.time)) {
    return "第1〜第3希望をすべて選択してください。";
  }

  const unique = new Set(slots.map(slot => `${slot.date} ${slot.time}`));

  if (unique.size !== slots.length) {
    return "同じ日時を複数の希望に指定することはできません。";
  }

  return "";
}

async function submitReservationInquiry(event) {
  event.preventDefault();

  const message = document.getElementById("reservation-message");
  const submitButton = document.getElementById("reservation-submit");

  if (!lastEstimateContext) {
    message.textContent = "先にお見積もりを表示してください。";
    return;
  }

  const slots = getPreferredSlots();
  const slotError = validatePreferredSlots(slots);

  if (slotError) {
    message.textContent = slotError;
    return;
  }

  const name = document.getElementById("request-name").value.trim();
  const lineName = document.getElementById("request-line").value.trim();
  const phone = document.getElementById("request-phone").value.trim();
  const address = document.getElementById("request-address").value.trim();
  const memo = document.getElementById("request-memo").value.trim();

  if (!name || !lineName) {
    message.textContent = "お名前とLINE表示名を入力してください。";
    return;
  }

  if (lastEstimateContext.travel && !address) {
    message.textContent = "出張希望の場合は住所を入力してください。";
    return;
  }

  if (!INQUIRY_API) {
    message.textContent = "受付APIの接続準備中です。";
    return;
  }

  const payload = {
    action: "inquiry",
    estimate: lastEstimateContext,
    customer: {
      name,
      lineName,
      phone,
      address,
      memo
    },
    preferences: slots
  };

  submitButton.disabled = true;
  submitButton.textContent = "送信中...";
  message.textContent = "";

  try {
    const response = await fetch(INQUIRY_API, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "submit error");
    }

    message.textContent =
      "予約希望を受け付けました。内容を確認後、LINE等でご連絡します。";
    event.currentTarget.reset();

    for (let i = 1; i <= 3; i++) {
      const timeSelect = document.getElementById(`preferred-time-${i}`);
      setSelectMessage(timeSelect, "先に日付を選択してください");
      timeSelect.disabled = true;
    }
  } catch (error) {
    console.error(error);
    message.textContent =
      "送信に失敗しました。時間をおいて再度お試しください。";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "予約希望を送信";
  }
}


/* ==========================================
   空き状況
========================================== */

async function loadAvailability() {
  const wrapper =
    document.getElementById(
      "calendar-timeline"
    );

  wrapper.replaceChildren();

  const loading =
    document.createElement("div");

  loading.className = "loading-card";
  loading.textContent =
    "空き状況を読み込んでいます...";

  wrapper.appendChild(loading);

  try {
    const response = await fetch(
      `${AVAILABILITY_API}?t=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error(
        "空き状況を取得できませんでした"
      );
    }

    const data =
      await response.json();

    if (
      !data.success ||
      !Array.isArray(data.availability)
    ) {
      throw new Error(
        "空き状況データが不正です"
      );
    }

    renderAvailability(
      data.availability
    );

  } catch (error) {
    console.error(error);

    wrapper.replaceChildren();

    const errorBox =
      document.createElement("div");

    errorBox.className = "error-card";

    errorBox.textContent =
      "空き状況を読み込めませんでした。再読み込みをお試しください。";

    wrapper.appendChild(errorBox);
  }
}

function renderAvailability(items) {
  const wrapper =
    document.getElementById(
      "calendar-timeline"
    );

  wrapper.replaceChildren();

  const groups = {};

  items.forEach(item => {
    const date =
      parseApiDate(item.date);

    if (!date) return;

    const key =
      `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!groups[key]) {
      groups[key] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        items: []
      };
    }

    groups[key].items.push({
      ...item,
      parsedDate: date
    });
  });

  const groupList =
    Object.values(groups);

  if (!groupList.length) {
    const empty =
      document.createElement("div");

    empty.className = "loading-card";

    empty.textContent =
      "現在、公開中の空き状況はありません。";

    wrapper.appendChild(empty);
    return;
  }

  groupList.forEach(group => {
    const monthCard =
      document.createElement("section");

    monthCard.className = "month-card";

    const heading =
      document.createElement("h3");

    heading.className = "month-title";

    heading.textContent =
      `${group.year}年${group.month}月`;

    monthCard.appendChild(heading);

    const list =
      document.createElement("div");

    list.className =
      "availability-list";

    group.items.forEach(item => {
      list.appendChild(
        createAvailabilityRow(item)
      );
    });

    monthCard.appendChild(list);
    wrapper.appendChild(monthCard);
  });
}

function createAvailabilityRow(item) {
  const row =
    document.createElement("div");

  row.className = "availability-row";

  const dateBox =
    document.createElement("div");

  dateBox.className =
    "availability-date";

  const day =
    document.createElement("strong");

  day.textContent =
    `${item.parsedDate.getMonth() + 1}/${item.parsedDate.getDate()}`;

  const weekday =
    document.createElement("span");

  weekday.textContent =
    `（${getWeekday(item.parsedDate)}）`;

  dateBox.append(day, weekday);

  const status =
    document.createElement("span");

  status.className =
    `availability-status ${statusClass(item.status)}`;

  status.textContent =
    item.status || "―";

  row.append(dateBox, status);

  if (item.note) {
    const note =
      document.createElement("div");

    note.className =
      "availability-note";

    note.textContent = item.note;

    row.appendChild(note);
  }

  return row;
}

function parseApiDate(value) {
  if (!value) return null;

  const match =
    String(value).match(
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
    );

  if (!match) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function getWeekday(date) {
  return [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ][date.getDay()];
}

function statusClass(status) {
  switch (status) {
    case "〇":
      return "status-o";

    case "△":
      return "status-triangle";

    case "×":
      return "status-x";

    case "休":
      return "status-off";

    default:
      return "status-unknown";
  }
}


/* ==========================================
   ボタン
========================================== */

function setupButtons() {
  document
    .getElementById(
      "repair-estimate-btn"
    )
    .addEventListener(
      "click",
      showRepairEstimate
    );

  document
    .getElementById(
      "glass-calc-btn"
    )
    .addEventListener(
      "click",
      calcGlassCoating
    );

  document
    .getElementById(
      "ceramic-calc-btn"
    )
    .addEventListener(
      "click",
      calcCeramicCoating
    );

  document
    .getElementById(
      "calendar-reload"
    )
    .addEventListener(
      "click",
      loadAvailability
    );
}


/* ==========================================
   共通
========================================== */

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}
