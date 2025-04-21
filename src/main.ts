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
  const isDuplicate = data
    .slice(1)
    .some((row) => row[1] === userId && row[2] === originalMessageDate);

  if (isDuplicate) {
    return ContentService.createTextOutput("Already recorded");
  }

  sheet.appendRow([new Date(), userId, originalMessageDate]);
  return ContentService.createTextOutput("OK");
}

/**
 * デバッグログをスプレッドシートに記録する関数
 */
// function logToSheet(label: string, data: any): void {
//   const spreadsheet_debug = SpreadsheetApp.openById(spreadsheetId);
//   let sheet_debug = spreadsheet_debug.getSheetByName("DebugLogs");
//   if (!sheet_debug) {
//     sheet_debug = spreadsheet_debug.insertSheet("DebugLogs");
//     sheet_debug.appendRow(["Timestamp", "Label", "Data"]);
//   }
//   sheet_debug.appendRow([new Date(), label, JSON.stringify(data)]);
// }

global.doPost = doPost;
global.getMessageInfo = getMessageInfo;
global.formatDate = formatDate;
