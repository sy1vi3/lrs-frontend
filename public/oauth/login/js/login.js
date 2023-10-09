const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const API_OAuth = "OAuth"

function init() {
    websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");
    websocket.onmessage = function (event) {
        data = JSON.parse(event.data);
        switch (data.api) {
            case API_OAuth:
                handleLogin(data);
                break;
        }
    };

    websocket.onopen = function (event) {
        console.log("Connected to server");
        if (urlParams.get('code') != null) {
            websocket.send(JSON.stringify({ api: API_OAuth, operation: "send_code", code: urlParams.get('code') }));
        }
        else {
            console.log("nullcode");
        }
    };

    websocket.onclose = function (event) {
        
    };
}

function handleLogin(data) {
    if (data['operation'] == 'teams_codes') {
        html = '';
        codes = data['codes'];
        teams = Object.keys(codes);
        for (num in Object.keys(codes)) {
            team_number = teams[num]
            passcode = codes[team_number]
            html += '<button value="' + passcode + '" onclick="teamLogin(`' + passcode + '`)">' + team_number + '</button>';
        }
        if (html == "") {
            html = 'No registered teams are associated with this RobotEvents account.'
        }
        document.querySelector("#teamButtons").innerHTML = html;
    }
}

function teamLogin(code) {
    console.log(code)
    window.location.replace("console.liveremoteskills.org?token=" + code + "");
}
