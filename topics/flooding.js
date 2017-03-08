'use strict';
const messages = require('./messages');

const defaultValues = {
  activities: [],
  sensors: [
    {
      deviceId: 'abc123',
      deviceName: 'Behind the dishwasher',
      roomName: 'Kitchen',
      roomId: 'room1',
      batteryLevel: 8,
      alarmActive: false,
      online: true,
      silenced: false,
    }, {
      deviceId: 'abc124',
      deviceName: 'Underneath the refrigerator',
      roomName: 'Kitchen',
      roomId: 'room1',
      batteryLevel: 25,
      alarmActive: false,
      online: true,
      silenced: false,
    }, {
      deviceId: 'abc125',
      deviceName: 'Underneath the washing machine',
      roomName: 'Bathroom',
      roomId: 'room4',
      batteryLevel: 100,
      alarmActive: false,
      online: true,
      silenced: false,
    },
  ],
};

let state = JSON.parse(JSON.stringify(defaultValues));

const options = {
  qos: 0,
  retain: true,
};

function changeStatus(client, boxTopic, message) {
  if (!!message.command &&
      message.command === 'SITUATION_UNDER_CONTROL') {
    state.sensors.forEach((device) => {
      device.silenced = true;
    });

    updateLog({
      activity: message.command,
      text: 'confrimed by ' + message.username,
      title: 'Situation under control',
      reportedBy: message.username,
    })
    
    sendStatus(client, boxTopic);
  }
}

function triggerAlarm(client, boxTopic, id) {
  state.sensors.forEach((device) => {
    if (device.deviceId.toLowerCase() === id.toLowerCase()) {
      updateLog({
        activity: 'ALARM_TRIGGERED',
        text: 'Detected in ' + device.roomName + ' - ' + device.deviceName,
        title: 'Water detected!',
      });
      device.alarmActive = true;
    }
  });

  sendStatus(client, boxTopic);
}

function triggerLowBattery(client, boxTopic, id) {
  state.sensors.forEach((device) => {
    if (device.deviceId.toLowerCase() === id.toLowerCase()) {
      device.batteryLevel = 10;

      const text = 'The flooding detector in '+ device.roomName + ' (' + device.deviceName + ') is running low on battery';
      updateLog({
        activity: 'LOW_BATTERY',
        text,
        title: 'Battery running low',
      })
        
      messages.addMessage(client, boxTopic, {
        id: 'message-'+Math.random(),
        text,
        deviceId: device.deviceId,
        feature: 'flooding',
      });
    }
  });

  sendStatus(client, boxTopic);
}

function reset(client, boxTopic) {
  state = JSON.parse(JSON.stringify(defaultValues));
  sendStatus(client, boxTopic);
}

function waterLevelRestored(client, boxTopic) {
  state.sensors.forEach((device) => {
    device.alarmActive = false;
    device.silenced = false;
  });

  updateLog({
    activity: 'ALARM_CLEARED',
    text: 'The water level is restored. Situation under control',
    title: 'Water level restored',
  });

  sendStatus(client, boxTopic);
}

function sendStatus(client, boxTopic) {
  const topic = boxTopic+'/flooding/status';
  client.publish(topic, JSON.stringify(state), options);
}

function updateLog(event) {
  event.date = new Date().toISOString();
  state.activities.unshift(event);
  state.activities = state.activities.splice(0, 5);
}

module.exports = {
  sendStatus,
  triggerAlarm,
  triggerLowBattery,
  changeStatus,
  reset,
  waterLevelRestored,
};