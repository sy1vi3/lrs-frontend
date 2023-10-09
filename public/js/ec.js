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
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const API_livestream = "API_livestream"

var websocket;
var plannedClose = false;
var name = "";
var role = "";
var inspectionTeam = "";
var skillsRowid = -1;
var skillsAttempts = {};

var saveAttempts;
var saveTeam;
var oldProgram;

var ALL_ROOMS =[]

var chat_sound = new Audio('sounds/messagesound.mp3');

if (urlParams.get('token') != null) {
    console.log("loggin in")
    connect(true);
}

function showModal(text) {
    document.querySelector("#textModal .modal-text").innerHTML = text;
    document.querySelector("#textModal").classList.add("show");
}

function modalClose(selector) {
    document.querySelector(selector).classList.remove("show");
}

function playMessageSound() {
    //chat_sound.pause();
    //chat_sound.currentTime = 0;
    //chat_sound.play();
}

function tab(tab) {
    e = document.querySelectorAll(".tabContent.show");
    for (i = 0; i < e.length; i++) {
        e[i].classList.remove("show");
    }
    e = document.querySelectorAll(".ecTab.sel");
    for (i = 0; i < e.length; i++) {
        e[i].classList.remove("sel");
    }
    if (tab != "") {
        document.getElementById(tab.replace(" ", "")).classList.add("show");
        if (tab != API_chat)
            document.getElementById("tab" + tab.replace(" ", "")).classList.add("sel");
    }
}

function init() {    
    document.querySelector("#Login #accessCode").addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            document.querySelector("#Login button").click();
        }
    });
}

function connect(tokenLogin = false) {
    websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");
    websocket.onmessage = function (event) {
        data = JSON.parse(event.data);
        switch (data.api) {
            case API_login:
                if ("failure" in data)
                    showModal("Invalid access code");
            case API_main:
                handleMain(data);
                break;
            case API_chat:
                handleChat(data);
                break;
            case API_queue:
                handleQueue(data);
                break;
            case API_rankings:
                handleRankings(data);
                break;
            case API_inspection:
                handleInspection(data);
                break;
            case API_inspection_ctrl:
                handleInspectionCtrl(data);
                break;
            case API_skills:
                handleSkills(data);
                break;
            case API_skills_ctrl:
                handleSkillsCtrl(data);
                break;
            case API_skills_scores:
                handleSkillsScores(data);
                break;
            case API_meeting_ctrl:
                handleMeetingCtrl(data);
                break;
            case API_stats:
                fillStatsTable(data);
            case API_sound:
                playChatSound(data);
            case API_volunteers:
                updateVolunteers(data);
            case API_team_control:
                team_control(data);
        }
    };

    websocket.onopen = function (event) {
        if (tokenLogin == true) {
            console.log("Connected to server");
            loginToken = urlParams.get('token');
            window.history.replaceState(null, null, window.location.pathname);
            websocket.send(JSON.stringify({ api: API_login, operation: "login", accessCode: loginToken }));
            websocket.send(JSON.stringify({ api: API_rankings, operation: "get_rankings" }));
        }
        else {
            console.log("Connected to server");
            accessCode = document.querySelector("#Login #accessCode").value;
            websocket.send(JSON.stringify({ api: API_login, operation: "login", accessCode: accessCode }));
            websocket.send(JSON.stringify({ api: API_rankings, operation: "get_rankings" }));
        }
        var textBox = document.getElementById("typeHere");
        textBox.addEventListener("keydown", function (event) {
            if (event.keyCode == 13) {
                document.querySelector("#chatSendButton").click();
            }
        });
        oldProgram = "VIQC";
        document.querySelector("#SkillsControl #right").innerHTML = document.querySelector("#hiddenVIQC").innerHTML;
    };

    websocket.onclose = function (event) {
        document.querySelector("#header").classList.add("hide");
        document.querySelector("#mobileHeader").classList.add("hide");
        document.querySelector("#event-console").classList.add("hide");
        tab("");
        document.querySelector("#Login").classList.remove("hide");
        username = "";
        role = "";
        if (!plannedClose) {
            console.log("Lost connection to server");
            showModal("Unable to connect to Event Console server. Please make sure you have a working internet connection and log in again.");
        }
        plannedClose = false;
    };
}

function login() {
    accessCode = document.querySelector("#Login #accessCode").value;  
    if (accessCode == "UUDDLRLRBA") {
        window.location.replace("https://discord.com/invite/vrc");
    } else {
        connect();
    }
}

function logout() {
    document.querySelector("#Login #accessCode").value = "";
    plannedClose = true;
    websocket.close();
}

// API: Main

function handleMain(data) {
    if ("name" in data && "role" in data && "tablist" in data) {
        name = data.name;
        role = data.role;
        document.querySelector("#username").innerHTML = "Welcome, " + name + "!";
        document.querySelector("#mobileUser").innerHTML = name;
        if (role == "Observer") {
            document.querySelector("#messageBoard").classList.add("hide");
        }
        tabs = "";
        for (i = 0; i < data["tablist"].length; i++) {
            tabs += '<button id="tab' + data["tablist"][i].replace(" ", "") + '" class="ecTab" onclick="tab(\'' + data["tablist"][i] + '\')">' + data["tablist"][i] + '</button>';
        }
        document.querySelector("#tabsAndContent > #ecHeader").innerHTML = tabs;
        document.querySelector("#Login").classList.add("hide");
        document.querySelector("#header").classList.remove("hide");
        document.querySelector("#mobileHeader").classList.remove("hide");
        document.querySelector("#event-console").classList.remove("hide");
    } else if ("modal" in data) {
        showModal(data.modal);
    }
}

// API: Chat

function handleChat(data) {
    if (data.operation == "post") {
        html = "";
        for (i = 0; i < data.chat.length; i++) {
            msg = data.chat[i];
            html += '<div class="messageLine ' + msg.authorType + '" oncontextmenu="chatDelete(' + msg.rowid + ')"><span class="messageAuthor">' + msg.author + ': </span><span class="messageText">' + msg.message + '</span></div>';
        }
        e = document.querySelectorAll("#messageBoard #messageWindow");
        e[0].innerHTML = html;
        e[1].innerHTML = html;
        e[0].lastChild.scrollIntoView(false);
        e[1].lastChild.scrollIntoView(false);
        if (data.badge && data.chat[data.chat.length - 1].author != name)
            document.querySelector("#mobileHeader #messagesbutton .badge").classList.remove("hide");
    }
}

function playChatSound(data) {
    if (data.operation == "new_msg") {
        author = data.author;
        if (author != name) {
            playMessageSound();
            console.log("Play Sound");
        }
        else {
            console.log("Same User");
        }
    }
}

function chatType(instance) {
    e = document.querySelectorAll("#messageBoard textarea");
    e[instance].value = e[instance].value.replace(/\n/g, '');
    e[instance ? 0 : 1].value = e[instance].value;
}

function chatSend(instance) {
    e = document.querySelectorAll("#messageBoard textarea");
    if (e[instance].value.length > 0) {
        websocket.send(JSON.stringify({ api: API_chat, operation: "post", message: e[instance].value }));
        e[0].value = "";
        e[1].value = "";
    }
}

function chatDelete(rowid) {
    if (role != "Team" && role != "Observer") {
        if (confirm("Really delete this chat message?"))
            websocket.send(JSON.stringify({ api: API_chat, operation: "delete", rowid: rowid }));
        event.preventDefault();
        return false;
    }
}

function showMobileChat() {
    tab('Chat');
    document.querySelector("#mobileHeader #messagesbutton .badge").classList.add("hide");
}

// API: Queue

function handleQueue(data) {
    if (data.operation == "post") {
        queueHtml = "<tbody><tr><th>Position</th><th>Team</th><th>Queued for</th><th>Status</th></tr>";
        for (i = 0; i < data.queue.length; i++) {
            queueHtml += "<tr><td>" + (i + 1).toString() + "</td><td>" + data.queue[i].teamNum + "</td><td>" + data.queue[i].purpose + "</td><td>" + (data.queue[i].ongoing ? "Invited" : "") + "</td></tr>";
        }
        queueHtml += "</tbody>";
        e = document.querySelectorAll("#skillsQueue");
        for (i = 0; i < e.length; i++)
            e[i].innerHTML = queueHtml;

    } else if (data.operation == "postCtrl") {
        inspectQueue = "<tbody><tr><th>Position</th><th>Team</th><th>Queued for</th><th>Queued since</th><th>Actions</th></tr>";
        skillsQueue = inspectQueue;
        for (i = 0; i < data.queue.length; i++) {
            row = data.queue[i];
            if (role == "Event Partner")
                actions = row.referee + '<button onclick="queueRemove(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn red">Remove</button>';
            else if (row.referee == name)
                actions = '<button onclick="queueInvite(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn lavender">Re-Invite</button><button onclick="queueRemove(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn red">Remove</button>';
            else if (row.referee)
                actions = row.referee;
            else
                actions = '<button onclick="queueInvite(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn lavender">Invite</button>';
            inspectQueue += "<tr><td>" + (i + 1).toString() + "</td><td>" + row.teamNum + "</td><td>" + row.purpose + "</td><td>" + row.timeQueued + "</td><td>" + (row.purpose == "Inspection" ? actions : row.referee) + "</td></tr>";
            skillsQueue += "<tr><td>" + (i + 1).toString() + "</td><td>" + row.teamNum + "</td><td>" + row.purpose + "</td><td>" + row.timeQueued + "</td><td>" + (row.purpose != "Inspection" ? actions : row.referee) + "</td></tr>";
        }
        inspectQueue += "</tbody>";
        skillsQueue += "</tbody>";
        document.querySelector("#InspectionControl #teamsInQueue").innerHTML = inspectQueue;
        document.querySelector("#SkillsControl #teamsInQueue").innerHTML = skillsQueue;
    }
}

function queueInvite(team, purpose) {
    if (purpose == "Inspection")
        websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "invite", teamNum: team }));
    else {
        websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "get_comp", teamNum: team }));
        websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "invite", teamNum: team }));
        console.log("")
        document.querySelector("#teams.teamDropdown").value = team;
        if (purpose == "Driving Skills")
            document.getElementById("driving").checked = true;
        else
            document.getElementById("programming").checked = true;
    }
}

function queueRemove(team, purpose) {
    if (purpose == "Inspection")
        websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "remove", teamNum: team }));
    else
        websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "remove", teamNum: team }));
}

// API: Inspection

function handleInspection(data) {
    if (data.operation == "post") {
        document.getElementById("insp-status").innerHTML = data.status;
    }
}

function inspectionQueue() {
    websocket.send(JSON.stringify({ api: API_inspection, operation: "queue" }));
}

function inspectionUnqueue() {
    websocket.send(JSON.stringify({ api: API_inspection, operation: "unqueue" }));
}

// API: Inspection Control

function handleInspectionCtrl(data) {
    if (data.operation == "post") {
        inspHtml = "<tbody><tr><th>Team</th><th>Inspection Status</th><th>Actions</th></tr>";
        for (i = 0; i < data.inspections.length; i++) {
            row = data.inspections[i];
            inspHtml += "<tr><td>" + row.teamNum + "</td><td>" + row.result + "</td><td>" + '<button onclick="inspect(\'' + row.teamNum + '\')" class="btn gray">Inspect</button>' + "</td></tr>";
        }
        inspHtml += "</tbody>";
        document.querySelector("#InspectionControl #allTeams").innerHTML = inspHtml;

        passedTeams = '<option value=""></option>';
        for (i = 0; i < data.passedTeams.length; i++) {
            passedTeams += '<option value="' + data.passedTeams[i] + '">' + data.passedTeams[i] + '</option>';
        }
        skillsTeam = document.querySelector("#teams.teamDropdown").value;
        document.querySelector("#teams.teamDropdown").innerHTML = passedTeams;
        document.querySelector("#teams.teamDropdown").value = skillsTeam;

    } else if (data.operation == "editableForm") {
        inspectionTeam = data.data.teamNum;
        inspectionClear();
        if (data.data.result == 1)
            document.getElementById("partial").checked = true;
        else if (data.data.result == 2)
            document.getElementById("pass").checked = true;
        form = data.data.formData;
        if (form) {
            form = JSON.parse(form);
            if (form.system == "V5") {
                for (i = 1; i <= 27; i++) {
                    document.getElementById("v5-" + i).checked = form.checklist[i - 1];
                }
            } else if (form.system == "Cortex") {
                document.getElementById("cortexToggle").checked = true;
                for (i = 1; i <= 25; i++) {
                    document.getElementById("cortex-" + i).checked = form.checklist[i - 1];
                } 
            } else if (form.system == "IQ") {
                document.getElementById("iqToggle").checked = true;
                for (i = 1; i <= 25; i++) {
                    document.getElementById("iq-" + i).checked = form.checklist[i - 1];
                }
            } 
        }
    }
}

function inspect(team) {
    websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "getInspect", teamNum: team }));
}

function inspectionClear() {
    document.querySelector("#inspTeamNum").innerHTML = inspectionTeam;
    document.getElementById("V5Toggle").checked = true;
    for (i = 1; i <= 25; i++) {
        document.getElementById("v5-" + i).checked = false;
        document.getElementById("cortex-" + i).checked = false;
    }
    document.getElementById("v5-26").checked = false;
    document.getElementById("v5-27").checked = false;
    document.getElementById("not-started").checked = true;

    for (i = 1; i <= 12; i++) {
        document.getElementById("iq-" + i).checked = false;
    }
}

function inspectionSave() {
    if (inspectionTeam) {
        result = document.getElementById("partial").checked + 2 * document.getElementById("pass").checked;
        form = { system: "", checklist: [] };
        if (document.getElementById("cortexToggle").checked) {
            form.system = "Cortex";
            for (i = 1; i <= 25; i++) {
                form.checklist[i - 1] = document.getElementById("cortex-" + i).checked;
            }
        } else if (document.getElementById("V5Toggle").checked) {
            form.system = "V5";
            for (i = 1; i <= 27; i++) {
                form.checklist[i - 1] = document.getElementById("v5-" + i).checked;
            }
        } else {
            form.system = "IQ";
            for (i = 1; i <= 12; i++) {
                form.checklist[i - 1] = document.getElementById("iq-" + i).checked;
            }
        }
        websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "save", teamNum: inspectionTeam, formData: JSON.stringify(form), result: result }));
        inspectionTeam = "";
        inspectionClear();
    }
}

// API: Skills


function handleSkills(data) {
    if (data.operation == "post") {
        document.getElementById("dAttempts").innerHTML = data.drivingAttempts.toString() + " of 3";
        document.getElementById("pAttempts").innerHTML = data.programmingAttempts.toString() + " of 3";

    }
    else {
        console.log("show");
        if (data.scoresheet.comp == "viqc") {
            iqHandleSkills(data);
        }
        else {
            vrcHandleSkills(data);
        }

    }
}

function iqHandleSkills(data) {
    if (data.operation == "post") {
        document.getElementById("dAttempts").innerHTML = data.drivingAttempts.toString() + " of 3";
        document.getElementById("pAttempts").innerHTML = data.programmingAttempts.toString() + " of 3";

    } else if (data.operation == "showScore") {
        scoresheet = data.scoresheet;
        skillsType = scoresheet.type;
        if (skillsType == 1)
            skillsType = "Driving Skills";
        else if (skillsType == 2)
            skillsType = "Programming Skills";
        document.querySelector("#iqScoreModal #skillsType").innerHTML = skillsType;
        document.querySelector("#iqScoreModal #iqSkillsRisers").innerHTML = scoresheet.redBalls;
        document.querySelector("#iqScoreModal #iqSkillsRows").innerHTML = scoresheet.blueBalls;
        document.querySelector("#iqScoreModal #iqSkillsStacks").innerHTML = scoresheet.ownedGoals;
        document.querySelector("#iqScoreModal #iqSkillsFinalScore").innerHTML = scoresheet.score;
        document.querySelector("#iqScoreModal").classList.add("show");
    }
}


function vrcHandleSkills(data) {
    if (data.operation == "post") {
        document.getElementById("dAttempts").innerHTML = data.drivingAttempts.toString() + " of 3";
        document.getElementById("pAttempts").innerHTML = data.programmingAttempts.toString() + " of 3";

    } else if (data.operation == "showScore") {
        scoresheet = data.scoresheet;
        skillsType = scoresheet.type;
        if (skillsType == 1)
            skillsType = "Driving Skills";
        else if (skillsType == 2)
            skillsType = "Programming Skills";
        document.querySelector("#scoreModal #skillsType").innerHTML = skillsType;
        document.querySelector("#scoreModal #skillsRedBalls").innerHTML = scoresheet.redBalls;
        document.querySelector("#scoreModal #skillsBlueBalls").innerHTML = scoresheet.blueBalls;
        document.querySelector("#scoreModal #skillsStopTime").innerHTML = scoresheet.stopTime;
        document.querySelector("#scoreModal #skillsFinalScore").innerHTML = scoresheet.score;
        goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
        ownedGoals = scoresheet.ownedGoals;
        for (i = 0; i < goalList.length; i++) {
            document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("red");
            document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("blue");
            document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("none");
            if (i <= 2) j = i;
            else if (i <= 5) j = i + 1;
            else j = i + 2;
            if (ownedGoals[j] == "r")
                document.querySelector("#scoreModal #og" + goalList[i]).classList.add("red");
            else if (ownedGoals[j] == "b")
                document.querySelector("#scoreModal #og" + goalList[i]).classList.add("blue");
            else
                document.querySelector("#scoreModal #og" + goalList[i]).classList.add("none");
        }
        document.querySelector("#scoreModal").classList.add("show");
    }
}

function skillsQueueDriving() {
    websocket.send(JSON.stringify({ api: API_skills, operation: "queueDriving" }));
}

function skillsQueueProgramming() {
    websocket.send(JSON.stringify({ api: API_skills, operation: "queueProgramming" }));
}

function skillsUnqueue() {
    websocket.send(JSON.stringify({ api: API_skills, operation: "unqueue" }));
}

// API: Skills Control

function handleSkillsCtrl(data) {
    if (data.operation == "post") {
        skillsAttempts = data.attempts;
        skillsGetAttempts();
        scorelist = data.scores;
        html = "<tbody><tr><th>Time Scored</th><th>Team</th><th>Type</th><th>Score</th><th>Actions</th></tr>";
        for (i = 0; i < scorelist.length; i++) {
            html += "<tr><td>" + scorelist[i].timestamp + "</td><td>" + scorelist[i].teamNum + "</td><td>" + scorelist[i].type + "</td><td>" + scorelist[i].score + "</td><td>" + "<button onclick='skillsScoreEdit(" + scorelist[i].rowid + ")' class='btn lavender'>Edit</button>" + "<button onclick='skillsScoreDelete(" + scorelist[i].rowid + ")' class='btn red'>Delete</button>" + "</td></tr>";
        }
        html += "</tbody>";
        document.querySelector("#SkillsControl #allTeams").innerHTML = html;

    } else if (data.operation == "editableScore" && data.data.comp == "vrc") {
        scoresheet = data.data;
        skillsRowid = scoresheet.rowid;
        skillsClear();
        document.querySelector("#teams.teamDropdown").value = scoresheet.teamNum;
        skillsGetAttempts();
        document.getElementById("driving").checked = scoresheet.type == 1;
        document.getElementById("programming").checked = scoresheet.type == 2;
        document.getElementById("skillsRed").value = scoresheet.redBalls;
        document.getElementById("skillsBlue").value = scoresheet.blueBalls;
        document.getElementById("skillsStopTime").value = scoresheet.stopTime;
        goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
        ownedGoals = scoresheet.ownedGoals;
        for (i = 0; i < goalList.length; i++) {
            document.getElementById("og" + goalList[i]).classList.remove("red");
            document.getElementById("og" + goalList[i]).classList.remove("blue");
            document.getElementById("og" + goalList[i]).classList.remove("none");
            if (i <= 2) j = i;
            else if (i <= 5) j = i + 1;
            else j = i + 2;
            if (ownedGoals[j] == "r")
                document.getElementById("og" + goalList[i]).classList.add("red");
            else if (ownedGoals[j] == "b")
                document.getElementById("og" + goalList[i]).classList.add("blue");
            else
                document.getElementById("og" + goalList[i]).classList.add("none");
        }
        skillsCalc("none");
        document.querySelector("#skillsCancelEdit").classList.remove("hide");
    } else if (data.operation == "editableScore" && data.data.comp == "viqc") {
        scoresheet = data.data;
        skillsRowid = scoresheet.rowid;
        iqSkillsClear();
        document.querySelector("#teams.teamDropdown").value = scoresheet.teamNum;
        skillsGetAttempts();
        document.getElementById("driving").checked = scoresheet.type == 1;
        document.getElementById("programming").checked = scoresheet.type == 2;
        document.getElementById("iqRisers").value = scoresheet.redBalls;
        document.getElementById("iqRows").value = scoresheet.blueBalls;
        document.getElementById("iqStacks").value = scoresheet.ownedGoals;
        document.getElementById("skillsStopTime").value = scoresheet.stopTime;
        iqSkillsCalc("none");
        document.querySelector("#skillsCancelEdit").classList.remove("hide");
    } else if (data.operation == "setType") {
        teamNum = data.teamNum;
        program = data.comp;
        team_old = document.querySelector("#SkillsControl .teamDropdown").value;
        console.log(team_old);
        if (program == "VRC" && oldProgram != "VRC") {
            oldProgram = "VRC";
            setTypeVRC();
        }
        else if (program == "VIQC" && oldProgram != "VIQC") {
            oldProgram = "VIQC";
            setTypeVIQC();
        }
    }
}


function setTypeVRC() {
    document.querySelector("#SkillsControl #right").innerHTML = document.querySelector("#hiddenVRC").innerHTML;
    websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "get" }));
}

function setTypeVIQC() {
    document.querySelector("#SkillsControl #right").innerHTML = document.querySelector("#hiddenVIQC").innerHTML;
    websocket.send(JSON.stringify({ api: API_inspection_ctrl, operation: "get" }));
}

function skillsGetAttempts() {
    team = document.querySelector("#SkillsControl .teamDropdown").value;
    saveTeam = team;
    if (team == "")
        try {
            document.querySelector("#SkillsControl .skillsLabel").classList.add("hide");
        }
        catch {
            console.log("Unimportant Error Please Ignore")
        }
    else {
        websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "get_comp", teamNum: team }));
        attempts = skillsAttempts[team];
        saveAttempts = attempts;
        document.querySelector("#SkillsControl #dAttempts").innerHTML = attempts[0];
        document.querySelector("#SkillsControl #pAttempts").innerHTML = attempts[1];
        document.querySelector("#SkillsControl .skillsLabel").classList.remove("hide");
    }
}

function skillsOgToggle(goal) {
    if (document.getElementById("og" + goal).classList.contains("blue")) {
        document.getElementById("og" + goal).classList.remove("blue");
        document.getElementById("og" + goal).classList.add("red");
    } else if (document.getElementById("og" + goal).classList.contains("red")) {
        document.getElementById("og" + goal).classList.remove("red");
        document.getElementById("og" + goal).classList.add("none");
    } else {
        document.getElementById("og" + goal).classList.remove("none");
        document.getElementById("og" + goal).classList.add("blue");
    }
    skillsCalc("none");
}

function skillsClear() {
    document.getElementById("driving").checked = false;
    document.getElementById("programming").checked = false;
    document.getElementById("skillsRed").value = 0;
    document.getElementById("skillsBlue").value = 15;
    document.getElementById("skillsStopTime").value = 0;
    goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    for (i = 0; i < goalList.length; i++) {
        document.getElementById("og" + goalList[i]).classList.remove("red");
        document.getElementById("og" + goalList[i]).classList.remove("none");
        document.getElementById("og" + goalList[i]).classList.add("blue");
    }
    skillsCalc("none");
}

function iqSkillsClear() {
    document.getElementById("driving").checked = false;
    document.getElementById("programming").checked = false;
    document.getElementById("iqRisers").value = 0;
    document.getElementById("iqRows").value = 0;
    document.getElementById("iqStacks").value = 0;
    iqSkillsCalc("none");
}

function skillsCalc(action) {
    type = document.getElementById("driving").checked + 2 * document.getElementById("programming").checked;
    redBallsRaw = document.getElementById("skillsRed").value;
    blueBallsRaw = document.getElementById("skillsBlue").value;
    stopTimeRaw = document.getElementById("skillsStopTime").value;
    goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    redOwned = {};
    blueOwned = {};
    for (i = 0; i < goalList.length; i++) {
        redOwned[goalList[i]] = document.getElementById("og" + goalList[i]).classList.contains("red");
        blueOwned[goalList[i]] = document.getElementById("og" + goalList[i]).classList.contains("blue");
    }
    redRows = (redOwned.A && redOwned.B && redOwned.C)    // ABC
        + (redOwned.D && redOwned.E && redOwned.F)  // DEF
        + (redOwned.G && redOwned.H && redOwned.I)  // GHI
        + (redOwned.A && redOwned.D && redOwned.G)  // ADG
        + (redOwned.B && redOwned.E && redOwned.H)  // BEH
        + (redOwned.C && redOwned.F && redOwned.I)  // CFI
        + (redOwned.A && redOwned.E && redOwned.I)  // AEI
        + (redOwned.C && redOwned.E && redOwned.G); // CEG
    blueRows = (blueOwned.A && blueOwned.B && blueOwned.C)    // ABC
        + (blueOwned.D && blueOwned.E && blueOwned.F)  // DEF
        + (blueOwned.G && blueOwned.H && blueOwned.I)  // GHI
        + (blueOwned.A && blueOwned.D && blueOwned.G)  // ADG
        + (blueOwned.B && blueOwned.E && blueOwned.H)  // BEH
        + (blueOwned.C && blueOwned.F && blueOwned.I)  // CFI
        + (blueOwned.A && blueOwned.E && blueOwned.I)  // AEI
        + (blueOwned.C && blueOwned.E && blueOwned.G); // CEG
    if ((type != 1 && type != 2) || parseInt(redBallsRaw) != parseFloat(redBallsRaw) || parseFloat(redBallsRaw) < 0 || parseInt(redBallsRaw) > 15 || parseInt(blueBallsRaw) != parseFloat(blueBallsRaw) || parseFloat(blueBallsRaw) < 0 || parseInt(blueBallsRaw) > 15 || parseInt(stopTimeRaw) != parseFloat(stopTimeRaw) || parseFloat(stopTimeRaw) < 0 || parseInt(stopTimeRaw) > 60) {
        document.getElementById("skillsFinalScore").innerHTML = "--";
    } else {
        redAlliance = parseInt(redBallsRaw) + 6 * redRows;
        blueAlliance = parseInt(blueBallsRaw) + 6 * blueRows;
        score = redAlliance - blueAlliance + 63;
        document.getElementById("skillsFinalScore").innerHTML = score.toString();
        ownedGoals = "";
        for (i = 0; i < goalList.length; i++) {
            if (redOwned[goalList[i]])
                ownedGoals += "r";
            else if (blueOwned[goalList[i]])
                ownedGoals += "b";
            else
                ownedGoals += "n";
            if (i == 2 || i == 5)
                ownedGoals += ",";
        }
        scoresheet = {
            type: type,
            redBalls: parseInt(redBallsRaw),
            blueBalls: parseInt(blueBallsRaw),
            ownedGoals: ownedGoals,
            stopTime: parseInt(stopTimeRaw),
            score: score
        }
        if (document.querySelector("#teams.teamDropdown").value) {
            if (action == "show") {
                websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "showTeam", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet }));
            } else if (action == "save") {
                msg = { api: API_skills_ctrl, operation: "save", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet, comp: "vrc" };
                if (skillsRowid > -1)
                    msg.rowid = skillsRowid;
                websocket.send(JSON.stringify(msg));
                skillsRowid = -1;
                document.querySelector("#teams.teamDropdown").value = "";
                skillsGetAttempts();
                skillsClear();
            }
        }
    }
}


function iqSkillsCalc(action) {
    type = document.getElementById("driving").checked + 2 * document.getElementById("programming").checked;
    risersRaw = document.getElementById("iqRisers").value;
    rowsRaw = document.getElementById("iqRows").value;
    stacksRaw = document.getElementById("iqStacks").value;
    stopTimeRaw = 0;
    if ((type != 1 && type != 2) || parseInt(risersRaw) != parseFloat(risersRaw) || parseFloat(risersRaw) < 0 || parseInt(risersRaw) > 27 || parseInt(stacksRaw) != parseFloat(stacksRaw) || parseFloat(stacksRaw) < 0 || parseInt(stacksRaw) > 9 || parseInt(rowsRaw) != parseFloat(rowsRaw) || parseFloat(rowsRaw) < 0 || parseInt(rowsRaw) > 8 || parseInt(stopTimeRaw) != parseFloat(stopTimeRaw) || parseFloat(stopTimeRaw) < 0 || parseInt(stopTimeRaw) > 60) {
        document.getElementById("skillsFinalScore").innerHTML = "--";
    } else {
        score = parseInt(risersRaw) + parseInt(rowsRaw) * 3 + parseInt(stacksRaw) * 30;
        document.getElementById("skillsFinalScore").innerHTML = score.toString();
        scoresheet = {
            type: type,
            redBalls: parseInt(risersRaw),
            blueBalls: parseInt(rowsRaw),
            ownedGoals: parseInt(stacksRaw),
            stopTime: parseInt(stopTimeRaw),
            score: score,
            comp: "viqc"
        }
        if (document.querySelector("#teams.teamDropdown").value) {
            if (action == "show") {
                websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "showTeam", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet }));
            } else if (action == "save") {
                msg = { api: API_skills_ctrl, operation: "save", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet, comp: "viqc" };
                if (skillsRowid > -1)
                    msg.rowid = skillsRowid;
                websocket.send(JSON.stringify(msg));
                skillsRowid = -1;
                document.querySelector("#teams.teamDropdown").value = "";
                skillsGetAttempts();
                iqSkillsClear();
            }
        }
    }
}

function skillsScoreEdit(rowid) {
    websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "getScoresheet", rowid: rowid }));
}

function skillsScoreDelete(rowid) {
    if (confirm("Are you sure to delete this Skills score?\n\nTHIS ACTION IS IRREVERSIBLE!"))
        websocket.send(JSON.stringify({ api: API_skills_ctrl, operation: "deleteScore", rowid: rowid }));
}

function skillsCancelEdit() {
    skillsRowid = -1;
    document.querySelector("#teams.teamDropdown").value = "";
    skillsGetAttempts();
    try {
        skillsClear();
    }
    catch {
        iqSkillsClear()
    }

    document.querySelector("#skillsCancelEdit").classList.add("hide");
}


// API: Skills Scores

function handleSkillsScores(data) {
    if (data.operation == "post") {
        scorelist = data.scores;
        html = '<tbody><tr id="desktop"><th>Team</th><th>Time Scored</th><th>Skills Type</th><th>Final Score</th><th>View Scoresheet</th></tr><tr id="mobile"><th>Team</th><th>Time</th><th>Type</th><th>Score</th><th>Details</th></tr>';
        for (i = 0; i < scorelist.length; i++) {
            score = scorelist[i];
            html += '<tr><td>' + score.teamNum + '</td><td>' + score.timestamp + '</td><td><span id="desktop">' + score.type + '</span><span id="mobile"><i class="fas fa-' + (score.type == "Programming" ? 'code' : 'gamepad') + '"></i></span></td><td>' + score.score + '</td><td><button onclick="skillsScoreView(' + score.rowid + ')" class="btn dark"><i class="fas fa-search"></i></button></td></tr>';
        }
        html += "</tbody>";
        document.querySelector("#SkillsScores #scoreHistoryTable").innerHTML = html;
    }
}

function skillsScoreView(rowid) {
    websocket.send(JSON.stringify({ api: API_skills_scores, operation: "getScoresheet", rowid: rowid }));
}

// API: Meeting Control

function handleMeetingCtrl(data) {
    if (data.operation == "set_code") {
        if ("rooms" in data) {
            domain = "connect.liveremoteskills.org";
            options = [];
            jitsi = [];
            console.log(data.rooms);
            for (i = 1; i <= data.rooms; i++) {
                options.push({
                    roomName: "room" + i.toString(),
                    parentNode: document.querySelector("#MeetingControl #room" + i.toString()),
                    userInfo: { email: "", displayName: "Event Bot" }
                });
                jitsi.push(new JitsiMeetExternalAPI(domain, options[i - 1]));
            }
            console.log(options);
            console.log(jitsi);
        } else if ("room" in data && "password" in data) {
            i = data.room - 1;
            jitsi[i].executeCommand('password', data.password);
        }
    }
    else if (data.operation == "all_rooms") {
        ALL_ROOMS = data.rooms;
    }
}

function initMeetings() {
    document.querySelector("#MeetingControl #init").classList.add("hide");
    var script = document.createElement("script")
    script.type = "text/javascript";
    script.onload = function () {
        websocket.send(JSON.stringify({ api: API_meeting_ctrl, operation: "init" }));
    };
    script.src = "https://connect.liveremoteskills.org/external_api.js";
    document.getElementsByTagName("head")[0].appendChild(script);
}

// API: Event Control

function eventCtrl(flag, setting) {
    websocket.send(JSON.stringify({ api: API_event_ctrl, operation: "setToggle", "flag": flag, "setting": setting }));
}

function eventAnnouncement() {
    announcement = document.querySelector("#EventControl textarea#typeAnnounce");
    if (announcement.value.length > 0) {
        if (confirm("Really send announcement?")) {
            websocket.send(JSON.stringify({ api: API_event_ctrl, operation: "announce", message: announcement.value }));
            announcement.value = "";
        }
    }
}

// API: Tech Support



// Cool Color Stuff


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



//API: Rankings

function handleRankings(data) {
    if (data.operation == "return_data") {
        div_ranks = data.list;
        div_ranks_len = Object.keys(div_ranks).length;

        if (document.querySelector("#divsDropdown").value == null) {
            document.querySelector("#divsDropdown").value = "Science";
        }
        for (var property in div_ranks) {
            ranks = div_ranks[property]; 
            ranks_len = Object.keys(ranks).length;
            if (document.querySelector("#divsDropdown").value == property) {
                try {
                    program_type = ranks[1].comp;
                }
                catch {
                    continue;
                }
                if (program_type == "VRC") {
                    html = '<tbody><tr><th>Rank</th><th>Team</th><th>Total Score</th><th>Total Stop Time</th><th>Driver</th><th>Driver Time</th><th>Prog</th><th>Prog Time</th><th>2nd Driver</th><th>2nd Prog</th><th>3rd Driver</th><th>3rd Prog</th></tr>';
                    for (i = 0; i < ranks_len; i++) {
                        teaminfo = ranks[i + 1];
                        driver_1 = parseInt(teaminfo.combined) - parseInt(teaminfo.prog);
                        driver_stoptime = parseInt(teaminfo.stoptime) - parseInt(teaminfo.prog_stoptime);
                        html += ('<tr><td>' + teaminfo.rank + '</td><td>' + teaminfo.team + '</td><td>' + teaminfo.combined + '</td><td>' + teaminfo.stoptime + '</td><td>' + driver_1 + '</td><td>' + driver_stoptime + '</td><td>' + teaminfo.prog + '</td><td>' + teaminfo.prog_stoptime + '</td><td>' + teaminfo.driver_2 + '</td><td>' + teaminfo.prog_2 + '</td><td>' + teaminfo.driver_3 + '</td><td>' + teaminfo.prog_3 + '</td></tr>');
                    }
                }
                else if (program_type == "VIQC") {
                    html = '<tbody><tr><th>Rank</th><th>Team</th><th>Total Score</th><th>Driver</th><th>Prog</th><th>2nd Driver</th><th>2nd Prog</th><th>3rd Driver</th><th>3rd Prog</th></tr>';
                    for (i = 0; i < ranks_len; i++) {
                        teaminfo = ranks[i + 1];
                        driver_1 = parseInt(teaminfo.combined) - parseInt(teaminfo.prog);
                        driver_stoptime = parseInt(teaminfo.stoptime) - parseInt(teaminfo.prog_stoptime);
                        html += ('<tr><td>' + teaminfo.rank + '</td><td>' + teaminfo.team + '</td><td>' + teaminfo.combined + '</td><td>' + driver_1 + '</td><td>' + teaminfo.prog + '</td><td>' + teaminfo.driver_2 + '</td><td>' + teaminfo.prog_2 + '</td><td>' + teaminfo.driver_3 + '</td><td>' + teaminfo.prog_3 + '</td></tr>');
                    }
                }
                html += "</tbody>";
                document.querySelector("#Rankings #skillsScoreTable").innerHTML = html;
                document.getElementById("skillsScoreTable").style.backgroundColor = "#" + intToRGB(hashCode(property));
            }
        }

    }
    else if (data.operation == "div_fill") {
        old_value = document.querySelector("#divsDropdown").value;
        divs = data.list;
        divs_len = Object.keys(divs).length;
        html = '';
        for (i = 0; i < divs_len; i++) {
            div_name = divs[i + 1];
            html += '<option value="' + div_name + '" style="background-color:#' + intToRGB(hashCode(div_name)) + '">' + div_name + '</option>';
        }
        document.querySelector("#divsDropdown").innerHTML = html;
        document.querySelector("#divsDropdown").value = old_value;
    }
}

function refreshRanks() {
    websocket.send(JSON.stringify({ api: API_rankings, operation: "get_rankings" }));
}


function fillStatsTable() {
    teams_data = data.data;
    html = ''
    for (key in teams_data) {
        value = teams_data[key];
        html += "<tr><td>" + key + "</td><td>" + value.program + "</td><td>" + value.div + "</td><td>" + value.inspection + "</td><td>" + value.driver + "</td><td>" + value.prog + "</td></tr>"
    }
    num_teams = Object.keys(teams_data).length;
    num_runs = scorelist.length;
    proglist = {};
    driverlist = {};
    totalScores = 0;
    progScores = 0;
    driverScores = 0;
    for (run in scorelist) {
        if (scorelist[run].type == "Programming") {
            proglist[run] = scorelist[run];
            progScores += scorelist[run].score;
        }
        else if (scorelist[run].type == "Driving") {
            driverlist[run] = scorelist[run];
            driverScores += scorelist[run].score;
        }
        console.log(scorelist[run].type);
        totalScores += scorelist[run].score;
    }
    avg_total = Math.floor(totalScores / num_runs);
    avg_driver = Math.floor(driverScores / Object.keys(driverlist).length);
    avg_prog = Math.floor(progScores / Object.keys(proglist).length);
    document.querySelector("#statsTableBody").innerHTML = html;
    document.querySelector("#teamsAtEvent").innerHTML = "Teams at Event: " + num_teams;
    document.querySelector("#totalRun").innerHTML = "Skills Matches Run: " + num_runs;
    document.querySelector("#driverRun").innerHTML = "Driver Matches Run: " + Object.keys(driverlist).length;
    document.querySelector("#progRun").innerHTML = "Programming Matches Run: " + Object.keys(proglist).length;
    document.querySelector("#averageDriver").innerHTML = "Average Driver Score: " + avg_driver;
    document.querySelector("#averageProg").innerHTML = "Average Programming Score: " + avg_prog;
    document.querySelector("#averageCombined").innerHTML = "Average Combined Score: " + avg_total;

}


function RE_login() {
    window.location.replace("https://robotevents.com/oauth/authorize?client_id=8&redirect_uri=https%3A%2F%2Fconsole.liveremoteskills.org%2Foauth%2Flogin%2F&response_type=code");
}


function volunteer_table_add_row() {
    vol_name = document.querySelector("#volunteerName").value;
    vol_role = document.querySelector("#volunteerRole").value;
    vol_code = document.querySelector("#volunteerCode").value;

    all_codes = []
    for (u in volunteers) {
        all_codes.push(Object.values(volunteers[u])[1])
    }


    if (vol_name == "" || /[^a-zA-Z]/.test(vol_name)) {
        showModal("Please enter a valid username");
        return;
    }
    else if (vol_name in volunteers) {
        showModal("Please enter a unique username");
        return;
    }
    if (vol_code == "") {
        vol_code = "changeme";
    }
    else if (vol_code.length < 10) {
        showModal("Please enter a stronger access code");
        return;
    }
    else if (all_codes.includes(vol_code)) {
        showModal("Please enter a unique access code");
        return;
    }
    volunteers[vol_name] = { Role: vol_role, Passcode: vol_code }
    volunteer_to_add = { Role: vol_role, Passcode: vol_code, Name: vol_name }
    websocket.send(JSON.stringify({ api: API_volunteers, operation: "add", user_info: volunteer_to_add }));
    document.querySelector("#volunteerName").value = ""
    document.querySelector("#volunteerRole").value = "Staff"
    document.querySelector("#volunteerCode").value = ""
}

function updateVolunteers(data) {
    if (data.operation == "update") {
        volunteers = data.volunteers;
        keys = Object.keys(volunteers);
        html = ""
        for (u in keys) {
            user_name = keys[u]
            passcode = volunteers[user_name].Passcode;
            role = volunteers[user_name].Role;
            if (role == "Head Referee") {
                role = "Referee";
            }
            if (user_name != name && user_name != "Guest") {
                html += '<tr id="volunteer"><td id="name" class="smol">' + user_name + '</td><td id="role" class="smol">' + role + '</td><td id="passcode" class="smol">' + passcode + '</td><td class="smol" id="actions"><button class="btn yellow" onclick=edit_code(this.parentNode.parentNode)>Edit</button><button class="btn red" onclick=remove_volunteer(this.parentNode.parentNode.querySelector("#name"))>Revoke</button></td></tr>'
            }
            if (role == "Livestream") {
                streamcode = passcode;
            }
        }
        document.querySelector("#vol_table").innerHTML = html;
    }
}

function remove_volunteer(user) {
    if (confirm("Are you sure? Remove " + user.innerHTML + " as a volunteer?") == true) {
        delete volunteers[user.innerHTML];
        user.parentNode.remove();
        websocket.send(JSON.stringify({ api: API_volunteers, operation: "delete", user_info: user.innerHTML }));
    }
}

function handleClickAway(event) {

}

function edit_code(user) {
    all_current_edits = document.querySelectorAll(".editing");
    for (i = 0; i < all_current_edits.length; i++) {
        save_user(all_current_edits[i]);
    }

    user.classList.add("editing")

    existing_code = user.querySelector("#passcode").innerHTML;
    html = '<input type="text" id="edit_code" placeholder="' + existing_code + '">';
    user.querySelector("#passcode").innerHTML = html;
    user.querySelector("#edit_code").value = existing_code;

    existing_role = user.querySelector("#role").innerHTML;
    html = '<select id="edit_role"><option value="Staff">Staff</option><option value="Head Referee">Referee</option><option value="Event Partner">Event Partner</option></select>';
    user.querySelector("#role").innerHTML = html;
    if (existing_role == "Referee") {
        existing_role = "Head Referee";
    }
    user.querySelector("#edit_role").value = existing_role;

    existing_name = user.querySelector("#name").innerHTML;
    html = '<input type="text" id="edit_name" placeholder="' + existing_name + '">';
    user.querySelector("#name").innerHTML = html;
    user.querySelector("#name").value = existing_name;
    user.querySelector("#edit_name").value = existing_name;

    user.querySelector("#actions").innerHTML = '<button class="btn lavender" onclick=save_user(this.parentNode.parentNode)>Save</button><button class="btn red" onclick=remove_volunteer(this.parentNode.parentNode.querySelector("#name"))>Revoke</button>';
}

function save_user(user) {
    user.classList.remove("editing");
    oldname = user.querySelector("#name").value;
    username = user.querySelector("#edit_name").value;
    passcode = user.querySelector("#edit_code").value;
    userrole = user.querySelector("#edit_role").value;
    oldcode = volunteers[oldname].Passcode;
    if (username == "" || /[^a-zA-Z]/.test(username)) {
        showModal("Please enter a valid username");
        return;
    }
    else if (username in volunteers && username != oldname) {
        showModal("Please enter a unique username");
        return;
    }
    all_codes = []
    for (u in volunteers) {
        all_codes.push(Object.values(volunteers[u])[1]);
    }
    for (u in teams) {
        all_codes.push(Object.values(teams[u])[1]);
    }
    if (passcode == "") {
        vol_code = "changeme";
    }
    else if (passcode.length < 10) {
        showModal("Please enter a stronger access code");
        return;
    }
    else if (all_codes.includes(passcode) && passcode != oldcode) {
        showModal("Please enter a unique access code");
        return;
    }
    volunteers[oldname] = { Role: userrole, Passcode: passcode };
    if (oldname != username) {
        volunteers[username] = volunteers[oldname];
        delete volunteers[oldname];
    }

    edit_vol = { Name: username, Passcode: passcode, Role: userrole, OldName: oldname };
    websocket.send(JSON.stringify({ api: API_volunteers, operation: "edit", user_info: edit_vol }));
}

function team_edit_code(user) {
    all_current_team_edits = document.querySelectorAll(".editingteam");
    for (i = 0; i < all_current_team_edits.length; i++) {
        team_save_code(all_current_edits[i]);
    }

    user.classList.add("editingteam")

    existing_code = user.querySelector("#passcode").innerHTML;
    html = '<input type="text" id="edit_code" placeholder="' + existing_code + '">';
    user.querySelector("#passcode").innerHTML = html;
    user.querySelector("#edit_code").value = existing_code;

    user.querySelector("#actions").innerHTML = '<button class="btn lavender" onclick=team_save_code(this.parentNode.parentNode)>Save</button>';
    user.querySelector("#actions").classList.remove("threebuttonrow");
    user.querySelector("#actions").classList.add("onebuttonrow");
}

function team_save_code(user) {
    user.classList.remove("editingteam");
    username = user.querySelector("#name").innerHTML;
    passcode = user.querySelector("#edit_code").value;
    oldcode = teams[username].Passcode;
    all_codes = []
    for (u in volunteers) {
        all_codes.push(Object.values(volunteers[u])[1]);
    }
    for (u in teams) {
        all_codes.push(Object.values(teams[u])[1]);
    }
    if (passcode == "") {
        passcode = "changeme";
    }
    else if (passcode.length < 10) {
        showModal("Please enter a stronger access code");
        return;
    }
    else if (all_codes.includes(passcode) && passcode != oldcode) {
        showModal("Please enter a unique access code");
        return;
    }
    teams[username] = { Role: "Team", Passcode: passcode };

    edit_team = { Name: username, Passcode: passcode };
    websocket.send(JSON.stringify({ api: API_team_control, operation: "edit", user_info: edit_team }));
}

function team_force_logout(user) {
    teamnumber = user.querySelector("#name").innerHTML;
    if (confirm("Really logout all clients for " + teamnumber + "?")) {
        websocket.send(JSON.stringify({ api: API_tech_support, operation: "logoutUser", user: teamnumber }));
    }
}

function team_disable(user) {
    teamnumber = user.querySelector("#name").innerHTML;
    if (confirm("Really disable " + teamnumber + "'s account?")) {
        websocket.send(JSON.stringify({ api: API_tech_support, operation: "disableUser", user: teamnumber }));
    }
}

function team_control(data) {
    if (data.operation == "update_teams") {
        teams = data.teams;
        keys = Object.keys(teams);
        html = "";
        for (u in keys) {
            user_name = keys[u]
            passcode = teams[user_name].Passcode;
            enabled = teams[user_name].Enabled;
            if (enabled == 0) {
                html += '<tr id="event_team"><td id="name">' + user_name + '</td><td id="passcode">' + passcode + '</td><td class="threebuttonrow" id="actions"><button class="btn gray" onclick=team_edit_code(this.parentNode.parentNode)>Change Code</button><button class="btn yellow" onclick=team_force_logout(this.parentNode.parentNode)>Log Out</button><button class="btn green" onclick=team_enable(this.parentNode.parentNode)>Enable</button></td></tr>';
            }
            else {
                html += '<tr id="event_team"><td id="name">' + user_name + '</td><td id="passcode">' + passcode + '</td><td class="threebuttonrow" id="actions"><button class="btn gray" onclick=team_edit_code(this.parentNode.parentNode)>Change Code</button><button class="btn yellow" onclick=team_force_logout(this.parentNode.parentNode)>Log Out</button><button class="btn red" onclick=team_disable(this.parentNode.parentNode)>Disable</button></td></tr>';
            }
        }

        document.querySelector("#team_info_table_body").innerHTML = html;
    }
}

function team_enable(user) {
    teamnumber = user.querySelector("#name").innerHTML;
    websocket.send(JSON.stringify({ api: API_tech_support, operation: "enableUser", user: teamnumber }));
}

function refreshTeams() {
    if (confirm("Are you sure? Really refresh team list?")) {
        websocket.send(JSON.stringify({ api: API_event_ctrl, operation: "refresh_teams" }));
    }
}

function make_stream() {
    html = "<b>DO NOT LEAK</b> <br><br> ";
    for (room in ALL_ROOMS) {
        num = ALL_ROOMS[room];
        html += '<a href=https://console.liveremoteskills.org/stream?room=' + num + '&token=' + streamcode + '>Field ' + num + '</a> <br><br>';
    }
    showModal(html);
}