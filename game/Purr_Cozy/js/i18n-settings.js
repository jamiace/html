/* Installed after all settings extensions. */
I18n.installSettings();
if(UI.timerWords){const originalTimerWords=UI.timerWords.bind(UI);UI.timerWords=function(text){return I18n.lang==='ja'?[h('span',{class:'status-word',style:'white-space:normal;word-break:normal;',text:I18n.render(text)})]:originalTimerWords(text)}}
