const stampId = "syussya";

/**
 * 日付を YYYY/MM/DD 形式にフォーマットする関数
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

const properties = PropertiesService.getScriptProperties();
const targetChannelId = properties.getProperty("TARGET_CHANNEL_ID") || "";
const spreadsheetId = properties.getProperty("SPREADSHEET_ID") || "";
const slackToken = properties.getProperty("SLACK_TOKEN") || "";

/**
 * 処理済みイベントをチェックする関数
 */
function isEventProcessed(eventId: string): boolean {
  const cache = PropertiesService.getScriptProperties();
  const processedEvents = cache.getProperty("PROCESSED_EVENTS") || "[]";
  const events = JSON.parse(processedEvents) as string[];

  // 古いイベントを削除（最新の100件のみ保持）
  if (events.length > 100) {
    events.splice(0, events.length - 100);
  }

  return events.includes(eventId);
}

/**
 * イベントを処理済みとしてマークする関数
 */
function markEventAsProcessed(eventId: string): void {
  const cache = PropertiesService.getScriptProperties();
  const processedEvents = cache.getProperty("PROCESSED_EVENTS") || "[]";
  const events = JSON.parse(processedEvents) as string[];

  events.push(eventId);

  // 古いイベントを削除（最新の100件のみ保持）
  if (events.length > 100) {
    events.splice(0, events.length - 100);
  }

  cache.setProperty("PROCESSED_EVENTS", JSON.stringify(events));
}

/**
 * Slackからメッセージ情報を取得する関数
 */
function getMessageInfo(
  channelId: string,
  messageTs: string,
  slackToken: string
): any {
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&latest=${messageTs}&limit=1&inclusive=true`;

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + slackToken,
    },
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const text = response.getContentText();

    const json = JSON.parse(text);
    if (json.ok && json.messages && json.messages.length > 0) {
      return json.messages[0];
    } else {
      return null;
    }
  } catch (err) {
    return null;
  }
}

/**
 * デバッグログをスプレッドシートに記録する関数
 */
function logToSheet(label: string, data: any): void {
  const spreadsheet_debug = SpreadsheetApp.openById(spreadsheetId);
  let sheet_debug = spreadsheet_debug.getSheetByName("DebugLogs");
  if (!sheet_debug) {
    sheet_debug = spreadsheet_debug.insertSheet("DebugLogs");
    sheet_debug.appendRow(["Timestamp", "Label", "Data"]);
  }
  sheet_debug.appendRow([new Date(), label, JSON.stringify(data)]);
}

/**
 * Slackの:syussya:スタンプを捕捉して、スプレッドシートに記入する関数
 */
function doPost(
  e: GoogleAppsScript.Events.DoPost
): GoogleAppsScript.Content.TextOutput {
  const payload = JSON.parse(e.postData.contents);

  if (payload.type === "url_verification") {
    return ContentService.createTextOutput(payload.challenge).setMimeType(
      ContentService.MimeType.TEXT
    );
  }

  if (!payload.event) {
    return ContentService.createTextOutput("No event");
  }

  // イベントIDをチェック
  const eventId = payload.event_id;
  if (isEventProcessed(eventId)) {
    return ContentService.createTextOutput("Already processed");
  }

  if (payload.event.type !== "reaction_added") {
    return ContentService.createTextOutput("Not reaction_added");
  }

  if (payload.event.reaction !== stampId) {
    return ContentService.createTextOutput("Not target reaction");
  }

  const userId = payload.event.user;
  const messageTs = payload.event.item.ts;
  const channelId = payload.event.item.channel;
  let originalMessageDate: string | null = null;

  const messageInfo = getMessageInfo(channelId, messageTs, slackToken);
  const date = new Date(parseFloat(messageInfo.ts) * 1000);
  date.setDate(date.getDate() + 5);
  originalMessageDate = formatDate(date);

  if (channelId !== targetChannelId) {
    return ContentService.createTextOutput("Not target channel");
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName("出社記録");
  if (!sheet) {
    sheet = ss.insertSheet("出社記録");
    sheet.appendRow(["記録日時", "ユーザID", "送信日時"]);
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const existingUserId = data[i][1];
    const existingSendDate = data[i][2];

    if (existingUserId === userId && existingSendDate) {
      const existingDate = new Date(existingSendDate);
      const formattedExistingDate = formatDate(existingDate);

      if (formattedExistingDate === originalMessageDate) {
        return ContentService.createTextOutput("Duplicate entry");
      }
    }
  }
  sheet.appendRow([new Date(), userId, originalMessageDate]);
  markEventAsProcessed(eventId);

  return ContentService.createTextOutput("OK");
}

global.doPost = doPost;
