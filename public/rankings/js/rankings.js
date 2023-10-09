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
const comp_preset = "VRC"

var init = false;
var scrolling = false;

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
            case API_rankings:
                rankingsHandler(data);
                break;
        }
    };

    websocket.onopen = function (event) {
        console.log("Connected to server");
        websocket.send(JSON.stringify({ api: API_login, operation: "login", accessCode: token }));
    };

    websocket.onclose = function (event) {
        console.log("Lost connection to server");
    };
}

function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i) {
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function rankingsHandler(data) {
    saved_data = data;
    if (data.operation == "return_data") {
        div_ranks = data.list;
        div_ranks_len = Object.keys(div_ranks).length;
        document.querySelector("#rankingsParent").innerHTML = "";
        for (var property in div_ranks) {
            div_obj = document.createElement("div");
            div_obj.setAttribute("id", property);
            document.querySelector("#rankingsParent").appendChild(div_obj);

            div_header = document.createElement("h1");
            div_header.setAttribute("id", "skillsHeader" + property);
            document.querySelector("#" + property).appendChild(div_header);
            document.querySelector("#skillsHeader" + property).innerHTML = property;
            div_table = document.createElement("table");
            div_table.setAttribute("id", "skillsScoreTable" + property);
            document.querySelector("#" + property).appendChild(div_table);
        }

        for (var property in div_ranks) {
            ranks = div_ranks[property];
            ranks_len = Object.keys(ranks).length;

            html = '';
            for (i = 0; i < ranks_len; i++) {
                teaminfo = ranks[i + 1];
                driver_1 = parseInt(teaminfo.combined) - parseInt(teaminfo.prog);
                driver_stoptime = parseInt(teaminfo.stoptime) - parseInt(teaminfo.prog_stoptime);
                html += ('<tr><td>' + teaminfo.rank + '</td><td>' + teaminfo.team + '</td><td>' + teaminfo.combined + '</td><td>' + driver_1 + '</td><td>' + driver_stoptime + '</td><td>' + teaminfo.prog + '</td><td>' + teaminfo.prog_stoptime + '</td></tr>');
            }

            html += "</tbody>";
            document.querySelector("#skillsScoreTable" + property).innerHTML = html;
            document.getElementById("skillsScoreTable" + property).style.backgroundColor = "#" + intToRGB(hashCode(property));
        }
        if (document.querySelector("#rankingsParent").offsetHeight > (window.innerHeight - document.querySelector("#rankingsHeader").offsetHeight)) {  
            node = document.querySelector("#rankingsParent");
            toMatch = window.innerHeight;
            heightSum = 0;
            to_dupe = [];
            allHeights = 0;
            for (i in node.children) {
                child = node.children[i];
                if (child.nodeName == "DIV" && heightSum < toMatch) {
                    heightSum += child.offsetHeight;
                    to_dupe.push(child.id);
                }
                if(child.nodeName == "DIV"){
                    allHeights += child.offsetHeight;
                }
            }
            for (i in to_dupe) {
                old_innards = document.querySelector("#" + to_dupe[i]).innerHTML;
                div_obj = document.createElement("div");
                div_obj.setAttribute("id", to_dupe[i]);
                document.querySelector("#rankingsParent").appendChild(div_obj);
                div_obj.innerHTML = old_innards;
            }
            startScroll()
        }
        if (!init) {
            websocket.send(JSON.stringify({ api: API_livestream, operation: "get_ranks"}));
        }
        init = true;
    }
    
    
}

function startScroll() {
    if (!scrolling) {
        scrolling = true;
        pageScroll()
    }
}


function pageScroll() {
    if (window.pageYOffset < allHeights) {
        window.scrollBy(0, 1);
    }
    else {
        document.documentElement.scrollTop = 0;
    }
    scrolldelay = setTimeout(pageScroll, 10);
}



