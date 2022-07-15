chrome.alarms.create({ periodInMinutes: 1 });


chrome.alarms.onAlarm.addListener(() => {
  heartbeatCall()
  
  function heartbeatCall() {
    fetch("http://192.168.8.1/api/user/heartbeat")
}
});

