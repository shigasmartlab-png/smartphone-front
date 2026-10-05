/**
 * Shiga Smart Lab - 見積もりシミュレータ受付API
 *
 * デプロイ前に Apps Script の「スクリプト プロパティ」へ設定:
 * LINE_CHANNEL_ACCESS_TOKEN = LINE Messaging APIのチャネルアクセストークン
 * LINE_TO = 通知先のユーザーID / グループID
 */

const INQUIRY_SPREADSHEET_ID = "1lf5mTtMiuSy8NEm0XFjGq_qT8VKdytpINyutxj9-fnA";
const INQUIRY_SHEET_NAME = "シミュレータ受付";

function doGet() {
  return jsonResponse_({
    success: true,
    service: "Shiga Smart Lab inquiry API"
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.action !== "inquiry") {
      return jsonResponse_({
        success: false,
        message: "unsupported action"
      });
    }

    validatePayload_(payload);

    const estimate = payload.estimate || {};
    const customer = payload.customer || {};
    const preferences = payload.preferences || [];

    const spreadsheet = SpreadsheetApp.openById(INQUIRY_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(INQUIRY_SHEET_NAME);

    if (!sheet) {
      throw new Error("受付シートが見つかりません。");
    }

    const now = new Date();

    sheet.appendRow([
      now,
      estimate.requestType || "",
      customer.name || "",
      customer.lineName || "",
      customer.phone || "",
      customer.address || "",
      estimate.travel
        ? "出張" + (estimate.travelArea ? "（" + estimate.travelArea + "）" : "")
        : "来店",
      estimate.model || "",
      estimate.service || "",
      estimate.batteryType || "",
      estimate.capacity || "",
      estimate.coatingType || "",
      Number(estimate.total) || 0,
      preferences[0].date,
      preferences[0].time,
      preferences[1].date,
      preferences[1].time,
      preferences[2].date,
      preferences[2].time,
      customer.memo || ""
    ]);

    const lineNotified = sendLineNotification_(payload);

    return jsonResponse_({
      success: true,
      lineNotified: lineNotified
    });

  } catch (error) {
    console.error(error);

    return jsonResponse_({
      success: false,
      message: error && error.message
        ? error.message
        : "受付処理に失敗しました。"
    });
  }
}

function validatePayload_(payload) {
  const customer = payload.customer || {};
  const estimate = payload.estimate || {};
  const preferences = payload.preferences || [];

  if (!customer.name || !customer.lineName) {
    throw new Error("お名前とLINE表示名は必須です。");
  }

  if (!estimate.service || !Number.isFinite(Number(estimate.total))) {
    throw new Error("見積もり情報が不正です。");
  }

  if (!Array.isArray(preferences) || preferences.length !== 3) {
    throw new Error("希望日時を3つ指定してください。");
  }

  const keys = preferences.map(function(item) {
    if (!item || !item.date || !item.time) {
      throw new Error("第1〜第3希望をすべて指定してください。");
    }
    return item.date + " " + item.time;
  });

  if (new Set(keys).size !== 3) {
    throw new Error("同じ日時を複数指定することはできません。");
  }

  if (estimate.travel && !customer.address) {
    throw new Error("出張希望の場合は住所が必要です。");
  }
}

function sendLineNotification_(payload) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  const to = props.getProperty("LINE_TO");

  if (!token || !to) {
    return false;
  }

  const estimate = payload.estimate || {};
  const customer = payload.customer || {};
  const p = payload.preferences || [];

  const details = [
    "📱 新しい予約・問い合わせ",
    "",
    (estimate.model ? estimate.model + " / " : "") + (estimate.service || ""),
    estimate.batteryType ? "バッテリー種類：" + estimate.batteryType : "",
    estimate.capacity ? "容量：" + estimate.capacity : "",
    estimate.coatingType ? "コーティング：" + estimate.coatingType : "",
    "見積：" + formatYen_(estimate.total),
    estimate.travel
      ? "対応：出張" + (estimate.travelArea ? "（" + estimate.travelArea + "）" : "")
      : "対応：来店",
    "",
    "第1希望：" + p[0].date + " " + p[0].time,
    "第2希望：" + p[1].date + " " + p[1].time,
    "第3希望：" + p[2].date + " " + p[2].time,
    "",
    "お名前：" + customer.name,
    "LINE表示名：" + customer.lineName,
    customer.phone ? "電話：" + customer.phone : "",
    customer.address ? "住所：" + customer.address : "",
    customer.memo ? "備考：" + customer.memo : ""
  ].filter(Boolean);

  const response = UrlFetchApp.fetch(
    "https://api.line.me/v2/bot/message/push",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token
      },
      payload: JSON.stringify({
        to: to,
        messages: [
          {
            type: "text",
            text: details.join("\n")
          }
        ]
      }),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();

  if (status < 200 || status >= 300) {
    console.error("LINE notification failed: " + status + " " + response.getContentText());
    return false;
  }

  return true;
}

function formatYen_(value) {
  return "¥" + Number(value || 0).toLocaleString("ja-JP");
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
