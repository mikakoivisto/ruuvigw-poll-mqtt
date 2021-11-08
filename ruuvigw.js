const querystring = require('querystring');
const axios = require('axios').default;

class RuuviGateway {
  constructor (username, password, gwAddress) {
    this.username = username;
    this.password = password;
    this.gwAddress = gwAddress;
  }

  async getHistory(pollInterval) {
    let headers = {
      'Accept': 'application/json'
    }
    if (this.username) {
      headers.Authorization = "Basic " + new Buffer.from(this.username + ":" + this.password).toString("base64")
    }
    const req = await axios.get(
      this.gwAddress + '/history?time=' + pollInterval,
      {
        headers: headers
      }
    );

    if (req.status === 200) {
      this.history = req.data
      return req.data;
    } else {
      console.error('Failed to get history with status ' + req.status + ' body ' + req.data);
      throw new Error('Failed to get history with status ' + req.status + ' body ' + req.data)
    }

    return false;
  };
}

module.exports = RuuviGateway;