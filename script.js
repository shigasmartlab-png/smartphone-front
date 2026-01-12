// ★ RenderにデプロイされたAPIのURLに差し替えてください
const API_BASE = "https://あなたのサービス名.onrender.com";

function $(id) {
  return document.getElementById(id);
}

// 空き状況の表示
$("check-availability").addEventListener("click", async () => {
  const date = $("date").value;
  if (!date) {
    $("availability-result").innerHTML = `<p class="message error">日付を選択してください。</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/availability?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error("APIエラー");
    const data = await res.json();

    // プルダウン用に一度クリア
    const timeSelect = $("time");
    timeSelect.innerHTML = "";

    let html = `<p>${date} の空き状況：</p>`;
    html += `<div>`;
    data.slots.forEach(slot => {
      const cls = slot.status === "available" ? "available" : "reserved";
      html += `<span class="slot ${cls}">${slot.time}</span>`;

      // セレクトにも反映（空きのみ選択可能にする）
      if (slot.status === "available") {
        const opt = document.createElement("option");
        opt.value = slot.time;
        opt.textContent = slot.time;
        timeSelect.appendChild(opt);
      }
    });
    html += `</div>`;

    if (!timeSelect.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "この日は満席です";
      timeSelect.appendChild(opt);
    }

    $("availability-result").innerHTML = html;
  } catch (e) {
    console.error(e);
    $("availability-result").innerHTML = `<p class="message error">空き状況の取得に失敗しました。</p>`;
  }
});

// 予約登録
$("reserve-btn").addEventListener("click", async () => {
  const date = $("date").value;
  const time = $("time").value;
  const name = $("name").value.trim();
  const phone = $("phone").value.trim();
  const menu = $("menu").value.trim();
  const memo = $("memo").value.trim();

  if (!date || !time || !name || !phone || !menu) {
    $("reserve-message").innerHTML = `<p class="message error">日付・時間・お名前・電話番号・メニューは必須です。</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time, name, phone, menu, memo })
    });

    const data = await res.json();
    if (!res.ok) {
      $("reserve-message").innerHTML = `<p class="message error">${data.detail || "予約に失敗しました。"}</p>`;
      return;
    }

    $("reserve-message").innerHTML = `
      <p class="message success">
        ${data.message}<br>
        予約ID：<strong>${data.reservation_id}</strong><br>
        キャンセル時に必要になるので、控えておいてください。
      </p>
    `;

    // 予約後に空き状況を再取得して更新
    $("check-availability").click();
  } catch (e) {
    console.error(e);
    $("reserve-message").innerHTML = `<p class="message error">予約処理でエラーが発生しました。</p>`;
  }
});

// キャンセル
$("cancel-btn").addEventListener("click", async () => {
  const id = $("cancel-id").value.trim();
  if (!id) {
    $("cancel-message").innerHTML = `<p class="message error">予約IDを入力してください。</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id: id })
    });

    const data = await res.json();
    if (!res.ok) {
      $("cancel-message").innerHTML = `<p class="message error">${data.detail || "キャンセルに失敗しました。"}</p>`;
      return;
    }

    $("cancel-message").innerHTML = `<p class="message success">${data.message}</p>`;

    // キャンセル後に空き状況を再取得
    $("check-availability").click();
  } catch (e) {
    console.error(e);
    $("cancel-message").innerHTML = `<p class="message error">キャンセル処理でエラーが発生しました。</p>`;
  }
});
