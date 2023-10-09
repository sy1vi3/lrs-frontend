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

var websocket;
var plannedClose = false;
var name = "";
var role = "";
var inspectionTeam = "";
var skillsRowid = -1;
var skillsAttempts = {};

function showModal(text) {
  document.querySelector("#textModal .modal-text").innerHTML = text;
  document.querySelector("#textModal").classList.add("show");
}

function modalClose(selector) {
  document.querySelector(selector).classList.remove("show");
}

function tab(tab) {
  e = document.querySelectorAll(".tabContent.show");
  for(i = 0; i < e.length; i++) {
    e[i].classList.remove("show");
  }
  e = document.querySelectorAll(".ecTab.sel");
  for(i = 0; i < e.length; i++) {
    e[i].classList.remove("sel");
  }
  if(tab != "") {
    document.getElementById(tab.replace(" ","")).classList.add("show");
    if(tab != API_chat)
      document.getElementById("tab" + tab.replace(" ","")).classList.add("sel");
  }
}

function init() {
  document.querySelector("#Login #accessCode").addEventListener("keyup", function(event) {
    if(event.keyCode === 13) {
      document.querySelector("#Login button").click();
    }
  });
}

function connect() {
  websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");

  websocket.onmessage = function(event) {
    data = JSON.parse(event.data);
    switch(data.api) {
      case API_login:
        if("failure" in data)
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
      case API_tech_support:
        handleTechSupport(data);
        break;
    }
  };

  websocket.onopen = function(event) {
    console.log("Connected to server");
    accessCode = document.querySelector("#Login #accessCode").value;
    websocket.send(JSON.stringify({api: API_login, operation: "login", accessCode: accessCode}));
  };

  websocket.onclose = function(event) {
    document.querySelector("#header").classList.add("hide");
    document.querySelector("#mobileHeader").classList.add("hide");
    document.querySelector("#event-console").classList.add("hide");
    tab("");
    document.querySelector("#Login").classList.remove("hide");
    username = "";
    role = "";
    if(!plannedClose) {
      console.log("Lost connection to server");
      showModal("Unable to connect to Event Console server. Please make sure you have a working internet connection and log in again.");
    }
    plannedClose = false;
  };
}

function login() {
  accessCode = document.querySelector("#Login #accessCode").value;
  if(accessCode.length == 13) {
    connect();
  } else {
    showModal("Invalid access code");
  }
}
  
function logout() {
  document.querySelector("#Login #accessCode").value = "";
  plannedClose = true;
  websocket.close();
}

// API: Main

function handleMain(data) {
  if("name" in data && "role" in data && "tablist" in data) {
    name = data.name;
    role = data.role;
    document.querySelector("#username").innerHTML = "Welcome, " + name + "!";
    document.querySelector("#mobileUser").innerHTML = name;
    tabs = "";
    for(i = 0; i < data["tablist"].length; i++) {
      tabs += '<button id="tab' + data["tablist"][i].replace(" ","") + '" class="ecTab" onclick="tab(\'' + data["tablist"][i] + '\')">' + data["tablist"][i] + '</button>';
    }
    document.querySelector("#tabsAndContent > #ecHeader").innerHTML = tabs;
    document.querySelector("#Login").classList.add("hide");
    document.querySelector("#header").classList.remove("hide");
    document.querySelector("#mobileHeader").classList.remove("hide");
    document.querySelector("#event-console").classList.remove("hide");
  } else if("modal" in data) {
    showModal(data.modal);
  }
}

// API: Chat

function handleChat(data) {
  if(data.operation == "post") {
    html = "";
    for(i=0; i<data.chat.length; i++) {
      msg = data.chat[i];
      html += '<div class="messageLine ' + msg.authorType + '" oncontextmenu="chatDelete(' + msg.rowid + ')"><span class="messageAuthor">' + msg.author + ': </span><span class="messageText">' + msg.message + '</span></div>';
    }
    e = document.querySelectorAll("#messageBoard #messageWindow");
    e[0].innerHTML = html;
    e[1].innerHTML = html;
    e[0].lastChild.scrollIntoView(false);
    e[1].lastChild.scrollIntoView(false);
    if(data.badge && data.chat[data.chat.length - 1].author != name)
      document.querySelector("#mobileHeader #messagesbutton .badge").classList.remove("hide");
  }
}

function chatType(instance) {
  e = document.querySelectorAll("#messageBoard textarea");
  e[instance].value = e[instance].value.replace(/\n/g, '');
  e[instance ? 0 : 1].value = e[instance].value;
}

function chatSend(instance) {
  e = document.querySelectorAll("#messageBoard textarea");
  if(e[instance].value.length > 0) {
    websocket.send(JSON.stringify({api: API_chat, operation: "post", message: e[instance].value}));
    e[0].value = "";
    e[1].value = "";
  }
}

function chatDelete(rowid) {
  if(role != "Team" && role != "Observer") {
    if(confirm("Really delete this chat message?"))
      websocket.send(JSON.stringify({api: API_chat, operation: "delete", rowid: rowid}));
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
  if(data.operation == "post") {
    queueHtml = "<tbody><tr><th>Position</th><th>Team</th><th>Queued for</th><th>Status</th></tr>";
    for(i=0; i<data.queue.length; i++) {
      queueHtml += "<tr><td>" + (i+1).toString() + "</td><td>" + data.queue[i].teamNum + "</td><td>" + data.queue[i].purpose + "</td><td>" + (data.queue[i].ongoing ? "Invited" : "") + "</td></tr>";
    }
    queueHtml += "</tbody>";
    e = document.querySelectorAll("#skillsQueue");
    for(i = 0; i < e.length; i++)
      e[i].innerHTML = queueHtml;
    
  } else if(data.operation == "postCtrl") {
    inspectQueue = "<tbody><tr><th>Position</th><th>Team</th><th>Queued for</th><th>Queued since</th><th>Actions</th></tr>";
    skillsQueue = inspectQueue;
    for(i=0; i<data.queue.length; i++) {
      row = data.queue[i];
      if(role == "Event Partner")
        actions = row.referee + '<button onclick="queueRemove(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn red">Remove</button>';
      else if(row.referee == name)
        actions = '<button onclick="queueInvite(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn lavender">Re-Invite</button><button onclick="queueRemove(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn red">Remove</button>';
      else if(row.referee)
        actions = row.referee;
      else
        actions = '<button onclick="queueInvite(\'' + row.teamNum + '\', \'' + row.purpose + '\')" class="btn lavender">Invite</button>';
      inspectQueue += "<tr><td>" + (i+1).toString() + "</td><td>" + row.teamNum + "</td><td>" + row.purpose + "</td><td>" + row.timeQueued + "</td><td>" + (row.purpose == "Inspection" ? actions : row.referee) + "</td></tr>";
      skillsQueue += "<tr><td>" + (i+1).toString() + "</td><td>" + row.teamNum + "</td><td>" + row.purpose + "</td><td>" + row.timeQueued + "</td><td>" + (row.purpose != "Inspection" ? actions : row.referee) + "</td></tr>";
    }
    inspectQueue += "</tbody>";
    skillsQueue += "</tbody>";
    document.querySelector("#InspectionControl #teamsInQueue").innerHTML = inspectQueue;
    document.querySelector("#SkillsControl #teamsInQueue").innerHTML = skillsQueue;
  }
}

function queueInvite(team, purpose) {
  if(purpose == "Inspection")
    websocket.send(JSON.stringify({api: API_inspection_ctrl, operation: "invite", teamNum: team}));
  else {
    websocket.send(JSON.stringify({api: API_skills_ctrl, operation: "invite", teamNum: team}));
    document.querySelector("#teams.teamDropdown").value = team;
    if(purpose == "Driving Skills")
      document.getElementById("driving").checked = true;
    else
      document.getElementById("programming").checked = true;
  }
}

function queueRemove(team, purpose) {
  if(purpose == "Inspection")
    websocket.send(JSON.stringify({api: API_inspection_ctrl, operation: "remove", teamNum: team}));
  else
    websocket.send(JSON.stringify({api: API_skills_ctrl, operation: "remove", teamNum: team}));
}

// API: Inspection

function handleInspection(data) {
  if(data.operation == "post") {
    document.getElementById("insp-status").innerHTML = data.status;
  }
}

function inspectionQueue() {
  websocket.send(JSON.stringify({api: API_inspection, operation: "queue"}));
}

function inspectionUnqueue() {
  websocket.send(JSON.stringify({api: API_inspection, operation: "unqueue"}));
}

// API: Inspection Control

function handleInspectionCtrl(data) {
  if(data.operation == "post") {
    inspHtml = "<tbody><tr><th>Team</th><th>Inspection Status</th><th>Actions</th></tr>";
    for(i=0; i<data.inspections.length; i++) {
      row = data.inspections[i];
      inspHtml += "<tr><td>" + row.teamNum + "</td><td>" + row.result + "</td><td>" + '<button onclick="inspect(\'' + row.teamNum + '\')" class="btn gray">Inspect</button>' + "</td></tr>";
    }
    inspHtml += "</tbody>";
    document.querySelector("#InspectionControl #allTeams").innerHTML = inspHtml;
    
    passedTeams = '<option value=""></option>';
    for(i=0; i<data.passedTeams.length; i++) {
      passedTeams += '<option value="' + data.passedTeams[i] + '">' + data.passedTeams[i] + '</option>';
    }
    skillsTeam = document.querySelector("#teams.teamDropdown").value;
    document.querySelector("#teams.teamDropdown").innerHTML = passedTeams;
    document.querySelector("#teams.teamDropdown").value = skillsTeam;
  
  } else if(data.operation == "editableForm") {
    inspectionTeam = data.data.teamNum;
    inspectionClear();
    if(data.data.result == 1)
      document.getElementById("partial").checked = true;
    else if(data.data.result == 2)
      document.getElementById("pass").checked = true;
    form = data.data.formData;
    if(form) {
      form = JSON.parse(form);
      if(form.system == "V5") {
        for(i=1; i<=27; i++) {
          document.getElementById("v5-"+i).checked = form.checklist[i-1];
        }
      } else if(form.system == "Cortex") {
        document.getElementById("cortexToggle").checked = true;
        for(i=1; i<=25; i++) {
          document.getElementById("cortex-"+i).checked = form.checklist[i-1];
        }
      }
    }
  }
}

function inspect(team) {
  websocket.send(JSON.stringify({api: API_inspection_ctrl, operation: "getInspect", teamNum: team}));
}

function inspectionClear() {
  document.querySelector("#inspTeamNum").innerHTML = inspectionTeam;
  document.getElementById("V5Toggle").checked = true;
  for(i=1; i<=25; i++) {
    document.getElementById("v5-" + i).checked = false;
    document.getElementById("cortex-" + i).checked = false;
  }
  document.getElementById("v5-26").checked = false;
  document.getElementById("v5-27").checked = false;
  document.getElementById("not-started").checked = true;
}

function inspectionSave() {
  if(inspectionTeam) {
    result = document.getElementById("partial").checked + 2 * document.getElementById("pass").checked;
    form = {system: "", checklist: []};
    if(document.getElementById("cortexToggle").checked) {
      form.system = "Cortex";
      for(i=1; i<=25; i++) {
        form.checklist[i-1] = document.getElementById("cortex-"+i).checked;
      }
    } else {
      form.system = "V5";
      for(i=1; i<=27; i++) {
        form.checklist[i-1] = document.getElementById("v5-"+i).checked;
      }
    }
    websocket.send(JSON.stringify({api: API_inspection_ctrl, operation: "save", teamNum: inspectionTeam, formData: JSON.stringify(form), result: result}));
    inspectionTeam = "";
    inspectionClear();
  }
}

// API: Skills

function handleSkills(data) {
  if(data.operation == "post") {
    document.getElementById("dAttempts").innerHTML = data.drivingAttempts.toString() + " of 3";
    document.getElementById("pAttempts").innerHTML = data.programmingAttempts.toString() + " of 3";
    
  } else if(data.operation == "showScore") {
    scoresheet = data.scoresheet;
    skillsType = scoresheet.type;
    if(skillsType == 1)
      skillsType = "Driving Skills";
    else if(skillsType == 2)
      skillsType = "Programming Skills";
    document.querySelector("#scoreModal #skillsType").innerHTML = skillsType;
    document.querySelector("#scoreModal #skillsRedBalls").innerHTML = scoresheet.redBalls;
    document.querySelector("#scoreModal #skillsBlueBalls").innerHTML = scoresheet.blueBalls;
    document.querySelector("#scoreModal #skillsStopTime").innerHTML = scoresheet.stopTime;
    document.querySelector("#scoreModal #skillsFinalScore").innerHTML = scoresheet.score;
    goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    ownedGoals = scoresheet.ownedGoals;
    for(i = 0; i < goalList.length; i++) {
      document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("red");
      document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("blue");
      document.querySelector("#scoreModal #og" + goalList[i]).classList.remove("none");
      if(i <= 2) j = i;
      else if(i <= 5) j = i+1;
      else j = i+2;
      if(ownedGoals[j] == "r")
        document.querySelector("#scoreModal #og" + goalList[i]).classList.add("red");
      else if(ownedGoals[j] == "b")
        document.querySelector("#scoreModal #og" + goalList[i]).classList.add("blue");
      else
        document.querySelector("#scoreModal #og" + goalList[i]).classList.add("none");
    }
    document.querySelector("#scoreModal").classList.add("show");
  }
}

function skillsQueueDriving() {
  websocket.send(JSON.stringify({api: API_skills, operation: "queueDriving"}));
}

function skillsQueueProgramming() {
  websocket.send(JSON.stringify({api: API_skills, operation: "queueProgramming"}));
}

function skillsUnqueue() {
  websocket.send(JSON.stringify({api: API_skills, operation: "unqueue"}));
}

// API: Skills Control

function handleSkillsCtrl(data) {
  if(data.operation == "post") {
    skillsAttempts = data.attempts;
    skillsGetAttempts();
    scorelist = data.scores;
    html = "<tbody><tr><th>Time Scored</th><th>Team</th><th>Type</th><th>Score</th><th>Actions</th></tr>";
    for(i=0; i<scorelist.length; i++) {
      html += "<tr><td>" + scorelist[i].timestamp + "</td><td>" + scorelist[i].teamNum + "</td><td>" + scorelist[i].type + "</td><td>" + scorelist[i].score + "</td><td>" + "<button onclick='skillsScoreEdit(" + scorelist[i].rowid + ")' class='btn lavender'>Edit</button>" + "<button onclick='skillsScoreDelete(" + scorelist[i].rowid + ")' class='btn red'>Delete</button>" + "</td></tr>";
    }
    html += "</tbody>";
    document.querySelector("#SkillsControl #allTeams").innerHTML = html;
    
  } else if(data.operation == "editableScore") {
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
    for(i = 0; i < goalList.length; i++) {
      document.getElementById("og" + goalList[i]).classList.remove("red");
      document.getElementById("og" + goalList[i]).classList.remove("blue");
      document.getElementById("og" + goalList[i]).classList.remove("none");
      if(i <= 2) j = i;
      else if(i <= 5) j = i+1;
      else j = i+2;
      if(ownedGoals[j] == "r")
        document.getElementById("og" + goalList[i]).classList.add("red");
      else if(ownedGoals[j] == "b")
        document.getElementById("og" + goalList[i]).classList.add("blue");
      else
        document.getElementById("og" + goalList[i]).classList.add("none");
    }
    skillsCalc("none");
    document.querySelector("#skillsCancelEdit").classList.remove("hide");
  }
}

function skillsGetAttempts() {
  team = document.querySelector("#SkillsControl .teamDropdown").value;
  if(team == "")
    document.querySelector("#SkillsControl .skillsLabel").classList.add("hide");
  else {
    attempts = skillsAttempts[team];
    document.querySelector("#SkillsControl #dAttempts").innerHTML = attempts[0];
    document.querySelector("#SkillsControl #pAttempts").innerHTML = attempts[1];
    document.querySelector("#SkillsControl .skillsLabel").classList.remove("hide");
  }
}

function skillsOgToggle(goal) {
  if(document.getElementById("og" + goal).classList.contains("blue")) {
    document.getElementById("og" + goal).classList.remove("blue");
    document.getElementById("og" + goal).classList.add("red");
  } else if(document.getElementById("og" + goal).classList.contains("red")) {
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
  for(i = 0; i < goalList.length; i++) {
    document.getElementById("og" + goalList[i]).classList.remove("red");
    document.getElementById("og" + goalList[i]).classList.remove("none");
    document.getElementById("og" + goalList[i]).classList.add("blue");
  }
  skillsCalc("none");
}

function skillsCalc(action) {
  type = document.getElementById("driving").checked + 2 * document.getElementById("programming").checked;
  redBallsRaw = document.getElementById("skillsRed").value;
  blueBallsRaw = document.getElementById("skillsBlue").value;
  stopTimeRaw = document.getElementById("skillsStopTime").value;
  goalList = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  redOwned = {};
  blueOwned = {};
  for(i = 0; i < goalList.length; i++) {
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
  if((type != 1 && type != 2) || parseInt(redBallsRaw) != parseFloat(redBallsRaw) || parseFloat(redBallsRaw) < 0 || parseInt(redBallsRaw) > 15 || parseInt(blueBallsRaw) != parseFloat(blueBallsRaw) || parseFloat(blueBallsRaw) < 0 || parseInt(blueBallsRaw) > 15 || parseInt(stopTimeRaw) != parseFloat(stopTimeRaw) || parseFloat(stopTimeRaw) < 0 || parseInt(stopTimeRaw) > 60) {
    document.getElementById("skillsFinalScore").innerHTML = "--";
  } else {
    redAlliance = parseInt(redBallsRaw) + 6 * redRows;
    blueAlliance = parseInt(blueBallsRaw) + 6 * blueRows;
    score = redAlliance - blueAlliance + 63;
    document.getElementById("skillsFinalScore").innerHTML = score.toString();
    ownedGoals = "";
    for(i = 0; i < goalList.length; i++) {
      if(redOwned[goalList[i]])
        ownedGoals += "r";
      else if(blueOwned[goalList[i]])
        ownedGoals += "b";
      else
        ownedGoals += "n";
      if(i == 2 || i == 5)
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
    if(document.querySelector("#teams.teamDropdown").value) {
      if(action == "show") {
        websocket.send(JSON.stringify({api: API_skills_ctrl, operation: "showTeam", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet}));
      } else if(action == "save") {
        msg = {api: API_skills_ctrl, operation: "save", teamNum: document.querySelector("#teams.teamDropdown").value, scoresheet: scoresheet};
        if(skillsRowid > -1)
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

function skillsScoreEdit(rowid) {
  websocket.send(JSON.stringify({api: API_skills_ctrl, operation: "getScoresheet", rowid: rowid}));
}

function skillsScoreDelete(rowid) {
  if(confirm("Are you sure to delete this Skills score?\n\nTHIS ACTION IS IRREVERSIBLE!"))
    websocket.send(JSON.stringify({api: API_skills_ctrl, operation: "deleteScore", rowid: rowid}));
}

function skillsCancelEdit() {
  skillsRowid = -1;
  document.querySelector("#teams.teamDropdown").value = "";
  skillsGetAttempts();
  skillsClear();
  document.querySelector("#skillsCancelEdit").classList.add("hide");
}

// API: Skills Scores

function handleSkillsScores(data) {
  if(data.operation == "post") {
    scorelist = data.scores;
    html = '<tbody><tr id="desktop"><th>Team</th><th>Time Scored</th><th>Skills Type</th><th>Final Score</th><th>View Scoresheet</th></tr><tr id="mobile"><th>Team</th><th>Time</th><th>Type</th><th>Score</th><th>Details</th></tr>';
    for(i=0; i<scorelist.length; i++) {
      score = scorelist[i];
      html += '<tr><td>' + score.teamNum + '</td><td>' + score.timestamp + '</td><td><span id="desktop">' + score.type + '</span><span id="mobile"><i class="fas fa-' + (score.type == "Programming" ? 'code' : 'gamepad') + '"></i></span></td><td>' + score.score + '</td><td><button onclick="skillsScoreView(' + score.rowid + ')" class="btn dark"><i class="fas fa-search"></i></button></td></tr>';
    }
    html += "</tbody>";
    document.querySelector("#SkillsScores #scoreHistoryTable").innerHTML = html;
  }
}

function skillsScoreView(rowid) {
  websocket.send(JSON.stringify({api: API_skills_scores, operation: "getScoresheet", rowid: rowid}));
}

// API: Meeting Control

function handleMeetingCtrl(data) {
  if("rooms" in data) {
    domain = "connect.liveremoteskills.org";
    options = [];
    jitsi = [];
    for(i = 1; i <= data.rooms; i++) {
      options.push({
        roomName: "room" + i.toString(),
        parentNode: document.querySelector("#MeetingControl #room" + i.toString()),
        userInfo: {email: "", displayName: "Event Bot"}
      });
      jitsi.push(new JitsiMeetExternalAPI(domain, options[i-1]));
    }
    console.log(options);
    console.log(jitsi);
  } else if("room" in data && "password" in data) {
    i = data.room - 1;
    jitsi[i].executeCommand('password', data.password);
  }
}

function initMeetings() {
  document.querySelector("#MeetingControl #init").classList.add("hide");
  var script = document.createElement("script")
  script.type = "text/javascript";
  script.onload = function(){
    websocket.send(JSON.stringify({api: API_meeting_ctrl, operation: "init"}));
  };
  script.src = "https://connect.liveremoteskills.org/external_api.js";
  document.getElementsByTagName("head")[0].appendChild(script);
}

// API: Event Control

function eventCtrl(flag, setting) {
  websocket.send(JSON.stringify({api: API_event_ctrl, operation: "setToggle", "flag": flag, "setting": setting}));
}

function eventAnnouncement() {
  announcement = document.querySelector("#EventControl textarea#typeAnnounce");
  if(announcement.value.length > 0) {
    if(confirm("Really send announcement?")) {
      websocket.send(JSON.stringify({api: API_event_ctrl, operation: "announce", message: announcement.value}));
      announcement.value = "";
    }
  }
}

// API: Tech Support

function handleTechSupport(data) {
  if("users" in data) {
    userlist = '<option value=""></option>';
    for(i=0; i<data.users.length; i++) {
      userlist += '<option value="' + data.users[i] + '">' + data.users[i] + '</option>';
    }
    document.querySelector("#TechSupport select").innerHTML = userlist;
  }
}

function techLogoutAll() {
  user = document.querySelector("#TechSupport select").value;
  if(user != "") {
    if(confirm("Really logout all clients for " + user + "?"))
      websocket.send(JSON.stringify({api: API_tech_support, operation: "logoutUser", user: user}));
  }
}

function techChangePasscode() {
  user = document.querySelector("#TechSupport select").value;
  pass = document.querySelector("#TechSupport #passcode");
  if(user != "") {
    if(pass.value.length != 13)
      showModal("Must be 13 characters in length");
    else if(confirm("Really change access code for " + user + "?")) {
      websocket.send(JSON.stringify({api: API_tech_support, operation: "changePasscode", user: user, passcode: pass.value}));
      pass.value = "";
    }
  }
}

//API: Rankings

function handleRankings(data) {
    if (data.operation == "return_data") {
        div_ranks = data.list;
        div_ranks_len = Object.keys(div_ranks).length;
        html = '<tbody><tr><th>Rank</th><th>Team</th><th>Score</th><th>Stop Time</th></tr>';
        if (document.querySelector("#divsDropdown").value == null) {
            document.querySelector("#divsDropdown").value = "Science";
        }
        for (var property in div_ranks) {
            ranks = div_ranks[property];
            ranks_len = Object.keys(ranks).length;
            if (document.querySelector("#divsDropdown").value == property) {
                for (i = 0; i < ranks_len; i++) {
                    teaminfo = ranks[i + 1];
                    html += '<tr><td>' + teaminfo.rank + '</td><td>' + teaminfo.team + '</td><td>' + teaminfo.combined + '</td><td>' + teaminfo.stoptime + '</td></tr>';
                }
            }
        }
        html += "</tbody>";
        document.querySelector("#Rankings #skillsScoreTable").innerHTML = html;
    }
    else if (data.operation == "div_fill") {
        old_value = document.querySelector("#divsDropdown").value;
        divs = data.list;
        divs_len = Object.keys(divs).length;
        html = '';
        for (i = 0; i < divs_len; i++) {
            div_name = divs[i + 1];
            html += '<option value="' + div_name + '">' + div_name + '</option>'
        }
        document.querySelector("#divsDropdown").innerHTML = html;
        document.querySelector("#divsDropdown").value = old_value;
    }
}

function refreshRanks() {
    websocket.send(JSON.stringify({ api: API_rankings, operation: "get_rankings"}));
}