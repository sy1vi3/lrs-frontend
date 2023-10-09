const API_livestream = "Livestream"
const API_login = "Login"
const API_main = "Main"
const API_chat = "Chat"
const API_queue = "Queue"
const API_inspection = "Inspection"
const API_inspection_ctrl = "Inspection Control"
const API_skills = "Skills"
const API_skills_ctrl = "Skills Control"
const API_skills_scores = "Skills Scores"
const API_meeting_ctrl = "Meeting Control"
const API_event_ctrl = "Event Control"
const API_tech_support = "Tech Support"
const API_rankings = "Rankings"
const API_stats = "Stats"
const API_volunteers = "Volunteers"
const API_sound = "Sound"
const API_team_control = "Team Control"
const API_output = "Output"

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

var activeRooms = [];
var livestreamPasscode = "";

function connect() {
    websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");
    websocket.onmessage = function (event) {
        data = JSON.parse(event.data);
        switch (data.api) {
            case API_login:
                if ("failure" in data) {
                    console.log("Login fail")
                }
                break;
            case API_output:
                outputHandler(data);
                break;
        }
    };

    websocket.onopen = function (event) {
        console.log("Connected to server");
        websocket.send(JSON.stringify({ api: API_login, operation: "login", accessCode: token}));
    };

    websocket.onclose = function (event) {
        console.log("Lost connection to server");
    };
}

function createNewRoom(room) {
    room_obj = document.querySelector('#room' + room) !== null
    if (!room_obj) {

        console.log("creating" + room)
        document.querySelector("#Livestreams").innerHTML = "";
        var ifrm = document.createElement("iframe");
        if (room != 0) {
            ifrm.setAttribute("src", "https://console.liveremoteskills.org/stream/?room=" + room + "&token=" + livestreamPasscode);
        }
        else {
            ifrm.setAttribute("src", "https://console.liveremoteskills.org/rankings?token=" + livestreamPasscode);
        }
        ifrm.setAttribute('frameBorder', "0");
        ifrm.setAttribute('id', 'room' + room);
        document.querySelector("#Livestreams").appendChild(ifrm);
    }
}

function outputHandler(data) {
    if (data.operation == "setAliveRooms") {
        if (livestreamPasscode != "") { // "If we're actually logged in"
            let rooms = data.data;
            let new_rooms = [];
            let rm_rooms = [];
            for (i in rooms) {
                let sp_room_data = rooms[i];
                if (sp_room_data.active) {
                    if (!activeRooms.includes(i)) {
                        activeRooms.push(i);
                        new_rooms.push(i);
                    }
                }
                else if (!sp_room_data.active) {
                    if (activeRooms.includes(i)) {
                        index = activeRooms.indexOf(i);
                        activeRooms.splice(index, 1);
                        rm_rooms.push(i);
                    }
                }
            }
        }
    }
    else if (data.operation == "setActiveRoom") {

        new_active_room = data.room;
        console.log(new_active_room);
        createNewRoom(new_active_room);
    }
    else if (data.operation == "setStreamCode") {
        livestreamPasscode = data.auth;
        console.log(livestreamPasscode);
        websocket.send(JSON.stringify({ api: API_output, operation: "get_alive" }));
    }
}


