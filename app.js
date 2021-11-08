const mqttApi = require ('mqtt')
const RuuviGateway = require('./ruuvigw')

var CONFIG
var mqttConnected = false

// Setup Exit Handwlers
process.on('exit', processExit.bind(null, 0))
process.on('SIGINT', processExit.bind(null, 0))
process.on('SIGTERM', processExit.bind(null, 0))
process.on('uncaughtException', function(err) {
    console.log(err)
    processExit(2)
})

// Set offline status on exit
async function processExit(exitCode) {
  // TODO set status to offline
  process.exit(exitCode)
}

// Initiate the connection to MQTT broker
function initMqtt() {
  const mqtt_user = CONFIG.mqtt_user ? CONFIG.mqtt_user : null
  const mqtt_pass = CONFIG.mqtt_pass ? CONFIG.mqtt_pass : null
  const mqtt = mqttApi.connect({
      host:CONFIG.host,
      port:CONFIG.port,
      username: mqtt_user,
      password: mqtt_pass
  });
  return mqtt
}

async function sleep(sec) {
  return msleep(sec*1000)
}

// Sleep function (milliseconds)
async function msleep(msec) {
  return new Promise(res => setTimeout(res, msec))
}

// Create CONFIG object from file or envrionment variables
async function initConfig(configFile) {
  console.log('Using configuration file: '+configFile)
  try {
      CONFIG = require(configFile)
  } catch (error) {
      console.log('Configuration file not found, attempting to use environment variables for configuration.')
      CONFIG = {
          "host": process.env.MQTTHOST,
          "port": process.env.MQTTPORT,
          "mqtt_user": process.env.MQTTUSER,
          "mqtt_pass": process.env.MQTTPASSWORD,
          "ruuvigw_user": process.env.RUUVIGW_USER,
          "ruuvigw_pass": process.env.RUUVIGW_PASS,
          "ruuvigw_address": process.env.RUUVIGW_ADDRESS,
          "ruuvi_topic": process.env.RUUVI_TOPIC,
          "poll_interval": process.env.RUUVIGW_POLL_INTERVAL
      }
  }
    // If there's no configured settings, force some defaults.
  CONFIG.host = CONFIG.host ? CONFIG.host : 'localhost'
  CONFIG.port = CONFIG.port ? CONFIG.port : '1883'
  CONFIG.ruuvi_topic = CONFIG.ruuvi_topic ? CONFIG.ruuvi_topic : 'ruuvi/'
  CONFIG.poll_interval = CONFIG.poll_interval ? CONFIG.poll_interval : 60
}

function pollRuuviGw(mqttClient, ruuvigw) {
  ruuvigw.getHistory(CONFIG.poll_interval).then(
    history => {
      Object.keys(history.data.tags).forEach(function(tagMac) {
        console.log(tagMac)
        console.log(history.data.tags[tagMac])
        let payload = {
          "data": history.data.tags[tagMac]
        }
        mqttClient.publish(CONFIG.ruuvi_topic + tagMac, JSON.stringify(payload))
      });
    }
  ).catch(e => {
    console.log(e)
  })
  setTimeout(function() { pollRuuviGw(mqttClient, ruuvigw)}, CONFIG.poll_interval*1000)
}

// Main code loop
const main = async() => {
  let configFile = './config.json'
  let ruuvigw
  let mqttClient

  // Initiate CONFIG object from file or environment variables
  await initConfig(configFile)

  if (!CONFIG.ruuvigw_address) {
    console.log("RuuviGateway address not configured")
    process.exit(2)
  }

  ruuvigw = new RuuviGateway(CONFIG.ruuvigw_user, CONFIG.ruuvigw_pass, CONFIG.ruuvigw_address)
 
  // Initiate connection to MQTT broker
  try {
    console.log('Starting connection to MQTT broker...')
    mqttClient = initMqtt()
    if (mqttClient.connected) {
        mqttConnected = true
        console.log('MQTT connection established, sending config/state information in 5 seconds.')
    }

    pollRuuviGw(mqttClient, ruuvigw)
  } catch (error) {
      console.log(error)
      console.log( 'Couldn\'t authenticate to MQTT broker. Please check the broker and configuration settings.')
      process.exit(1)
  }
}

main()
