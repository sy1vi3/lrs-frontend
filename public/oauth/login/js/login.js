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
        html = '<span>Choose a Team:</span>';
        codes = data['codes'];
        teams = Object.keys(codes);
        for (num in Object.keys(codes)) {
            team_number = teams[num]
            passcode = codes[team_number]
            if (team_number != "Guest") {
                if ((num % 3) == 0) {
                    button_type = 'btn lavender'
                }
                else if ((num % 2) == 0) {
                    button_type = 'btn red'
                }
                else {
                    button_type = 'btn yellow'
                }
                html += '<button class="' + button_type + '" value="' + passcode + '" onclick="teamLogin(`' + passcode + '`)">' + team_number + '</button>';
            }
            else {
                html = 'Your Robot&nbsp;Events account is not associated with a team registered for this event, or the Event Console is not currently configured to the correct event. <br> You will not be able to log into the Console until shortly before the event starts.';
                html += '<br> <br>Login as guest:<br>';
                html += '<button class="' + button_type + '" value="' + passcode + '" onclick="teamLogin(`' + passcode + '`)">' + team_number + '</button>';
            }
        }
        if (html == "<span>Choose a Team:</span>") {
            html = 'Your Robot&nbsp;Events account is not associated with a team registered for this event, or the Event Console is not currently configured to the correct event. <br> You will not be able to log into the Console until shortly before the event starts.';
        }
        document.querySelector("#form").innerHTML = html;
    }
}

function teamLogin(code) {
    console.log(code)
    window.location.replace("https://console.liveremoteskills.org?token=" + code + "");
}


