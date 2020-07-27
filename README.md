# tokuokun

![](https://github.com/KiKiKi-KiKi/gs-tokutokun/blob/master/assets/tokutokun-icon.png)

TOKUTOKUN is a Slack bot which work on GAS with SpreadSheet.

## Create Slack Bot

cf.

- https://tech.innovator.jp.net/entry/iine-slack-bot
  - https://qiita.com/soundTricker/items/43267609a870fc9c7453
  - https://qiita.com/oomri444/items/14b37502e7323edb10a8
- http://murokaco.hatenablog.com/entry/2018/12/05/133510
- https://tonari-it.com/gas-slack-create-app/
- [はじめてのSlack Bot – 2018年版](https://blog.katsubemakito.net/bot/slackbot_1st)

## TOKEN

[Build a Custom Integration](https://slack.com/apps/build/custom-integration)

### Incoming WebHooks

Slack に送信するための API endpoint

### Outgoing WebHooks

Slack からデータを取得するための API

[Outgoing WebHooksの設定](https://my.slack.com/services/new/outgoing-webhook/) からトークンを発行する

### text

テキスト内にメンションのあばあい `<@user_id>` の形で入ってくるっぽい

### SLACK_API_TOKEN


## GAS

### doGet

WebアプリからGETリクエストが送られた時に実行される関数

### doPost

WebアプリにPOSTリクエストが送られた時に実行される関数
