const SLACK_API_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
const OUTGOING_TOKEN = PropertiesService.getScriptProperties().getProperty('OUTGOING_TOKEN');
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const SHEET_NAME = 'record';
// user Data [index, name, toku, sendToku]
const USER_DATA_INDEX = {
  index: 0,
  name: 1,
  toku: 2,
  sendToku: 3,
  uid: 4,
};

// GAS don't have Array.prototypr.find method
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

const sendMessageToSlack = (slackApp) => (channelID) => (message) => {
  const botData = {
    username: 'tokutokun',
    icon_url: 'https://avatars.slack-edge.com/2020-04-05/1044182029697_ee4e93831f2b8888cd65_512.png',
  };

  return slackApp.chatPostMessage(channelID, message, botData);
};

// return Range (Array)
function getMemberData(sheet) {
  if (!sheet) { return []; }
  // typeof(range) =>> object
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5);
  // to Array
  return range.getValues();
}

// return data | undefined
const findMemberData = (range) => (target = 'uid') => (findVal) => {
  return range.find((data) => data[USER_DATA_INDEX[target]] === findVal);
}

const incrementToku = (target = 'toku') => (data) => {
  if (!(target === 'toku' || target === 'sendToku')) {
    return data;
  }
  const index = USER_DATA_INDEX[target];
  const userData = [...data];
  const toku = data[index] - 0;
  userData[index] = toku + 1;
  return userData;
};

// write to sheet
const updateTokuOnSheet = (sheet) => (target = 'toku') => (data) => {
  if (!(target === 'toku' || target === 'sendToku')) {
    return false;
  }

  const row = data[USER_DATA_INDEX.index] + 1;
  const col = USER_DATA_INDEX[target] + 1;
  const newToku = data[USER_DATA_INDEX[target]];
  const range = sheet.getRange(row, col);
  range.setValue(newToku);

  return range.getValue();
};

// Add New Record to sheet
const addMemberRecord = (sheet) => (name = 'NoName', toku = 0, sendToku = 0, uid = null) => {
  // get last Row Num
  const index = sheet.getLastRow();
  const addData = [index, name, toku, sendToku, uid];
  // Add New Row
  sheet.appendRow(addData);
  return addData;
};

const getSortUserList = (data) => (index) => {
  const sortList = data.sort((a, b) => {
    if( a[index] === b[index] ) { return 0; }
    return a[index] > b[index] ? -1 : 1;
  });
  return sortList;
}

function getTokuList(sheet) {
  const data = getMemberData(sheet);
  if (!data.length) { return 'No data'; }

  const sortList = getSortUserList(data)(USER_DATA_INDEX.toku);

  let text = '';
  sortList.forEach((item) => {
    const name = item[USER_DATA_INDEX.name];
    const toku = item[USER_DATA_INDEX.toku];
    const send = item[USER_DATA_INDEX.sendToku];
    text += `${name} ${toku} arigato (送った arigato ${send})\n`;
  });

  return text;
}

function getTokuSenderList(sheet) {
  const data = getMemberData(sheet);
  if (!data.length) { return 'No data'; }

  const sortList = getSortUserList(data)(USER_DATA_INDEX.sendToku);

  let text = '';
  sortList.forEach((item) => {
    const name = item[USER_DATA_INDEX.name];
    const toku = item[USER_DATA_INDEX.toku];
    const send = item[USER_DATA_INDEX.sendToku];
    text += `${name} 送った arigato ${send} (${toku} arigato)\n`;
  });

  return text;
}

// for debug
function debugTestMessage(message) {
  const slackApp = SlackApp.create(SLACK_API_TOKEN);
  const sendMessage = sendMessageToSlack(slackApp)('徳-thanks');
  sendMessage(`GAS TEST: ${message}`);
}

const debugAddUsetID = (sheet) => (data) => (uid) => {
  const row = data[USER_DATA_INDEX.index] + 1;
  const col = USER_DATA_INDEX.uid + 1;
  const range = sheet.getRange(row, col);
  range.setValue(uid);
  return;
}

// Main
function doPost(e) {
  if (OUTGOING_TOKEN === e.parameter.token && e.parameter.trigger_word === '++') {
    const slackApp = SlackApp.create(SLACK_API_TOKEN);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const sendMessage = sendMessageToSlack(slackApp)(e.parameter.channel_id);

    // show Toku List
    if (e.parameter.text.match(/\+\+ list$/)) {
      sendMessage( getTokuList(sheet) );
      return;
    }

    // show Toku sender List
    if (e.parameter.text.match(/\+\+ list sender$/)) {
      sendMessage( getTokuSenderList(sheet) );
      return;
    }

    const reg = /\+\+ <\@(.*)>(.*)/;
    const toku_params = e.parameter.text.match(reg);
    // debugTestMessage(`${e.parameter.text} ${JSON.stringify(e.parameter.text.match(/\+\+ <\@(name)>(.*)/))}`);
    if (toku_params === null) {
      return;
    }

    const targetUserInfo = slackApp.usersInfo(toku_params[1]);
    // unexist user
    if (!targetUserInfo['ok']) {
      return;
    }
    const targetUserID = targetUserInfo['user']['id'];
    const sendUserID = e.parameter.user_id;

    // don't allow self vote
    if (sendUserID === targetUserID) {
      sendMessage('自分に 徳 はおくれないです…');
      return;
    }

    const targetUserName = targetUserInfo['user']['real_name'];
    const memberData = getMemberData(sheet);
    const addNewMember = addMemberRecord(sheet);
    const updateToku = updateTokuOnSheet(sheet);

    // Update TOKU
    // TODO: change find by uid
    const targetUserData = findMemberData(memberData)('name')(targetUserName);

    if (!targetUserData) {
      addNewMember(targetUserName, 1, 0, targetUserID);
      sendMessage(`:tada: ${targetUserName} 1arigato 最初の:thanks:がおくられました:tada:`);
    } else {
      // set uID
      if ( !targetUserData[USER_DATA_INDEX.uid] ) {
        debugAddUsetID(sheet)(targetUserData)(targetUserID);
      }

      const updateTargetUserData = incrementToku('toku')(targetUserData);
      const tokuName = updateTargetUserData[USER_DATA_INDEX.name];
      const newToku = updateTargetUserData[USER_DATA_INDEX.toku];
      // update sheet
      if ( updateToku('toku')( updateTargetUserData ) ) {
        sendMessage(`:thanks: ${tokuName} ${newToku} arigato`);
      } else {
        // fail to update
        sendMessage(`@KiKiKi Fail to update Toku ${tokuName} -> ${newToku}`)
      }
    }

    // Update SEND TOKU
    const sendUserInfo = slackApp.usersInfo(sendUserID);
    const sendUserName = sendUserInfo['user']['real_name'];
    // TODO: change find by uid
    const sendUserData = findMemberData(memberData)('name')(sendUserName);

    if (!sendUserData) {
      addNewMember(sendUserName, 0, 1, sendUserID);
    } else {
      // set uID
      if ( !sendUserData[USER_DATA_INDEX.uid] ) {
        debugAddUsetID(sheet)(sendUserData)(sendUserID);
      }

      const updateTargetUserData = incrementToku('sendToku')(sendUserData);
      const sendTokuName = updateTargetUserData[USER_DATA_INDEX.name];
      const newSendToku = updateTargetUserData[USER_DATA_INDEX.sendToku];
      // update sheet
      if ( !updateToku('sendToku')( updateTargetUserData ) ) {
        // fail to update
        sendMessage(`@KiKiKi Fail to update SendToku ${sendTokuName} -> ${newSendToku}`)
      }
    }
  }
  return null;
}
