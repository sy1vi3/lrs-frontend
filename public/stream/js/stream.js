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
const API_jwt = "JWT"

const urlParams = new URLSearchParams(window.location.search);
const roomnum = urlParams.get('room');
const token = urlParams.get('token');
const silent = urlParams.get('silent');
var jitsi;

function load(roomcode, data) {
    domain = "connect.liveremoteskills.org";
    console.log("silent: " + silent);
    var options = {
            roomName: "room" + roomnum,
            jwt: data.jwt,
            width: '100%',
            height: '100%',
            parentNode: document.querySelector('#jitsiBox'),
            configOverwrite: {
                disableAudioLevels: true,
                enableNoAudioDetection: false,
                enableNoisyMicDetection: false,
                startAudioOnly: false,
                startWithAudioMuted: true,
                startSilent: false,
                maxFullResolutionParticipants: -1,
                startWithVideoMuted: true,
                startScreenSharing: false,
                hideLobbyButton: true,
                disableProfile: true,
                prejoinPageEnabled: false,
                enableAutomaticUrlCopy: false,
                disableDeepLinking: true,
                disableInviteFunctions: true,
                remoteVideoMenu: { disableKick: true },
                disableRemoteMute: true,
                disableTileView: true,
                hideConferenceSubject: true,
                hideConferenceTimer: true,
                hideParticipantsStats: true,
            },
            interfaceConfigOverwrite: {
                AUTO_PIN_LATEST_SCREEN_SHARE: false,
                CONNECTION_INDICATOR_DISABLED: true,
                DEFAULT_LOCAL_DISPLAY_NAME: 'Livestream',
                DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
                DISABLE_FOCUS_INDICATOR: true,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                DISABLE_PRESENCE_STATUS: true,
                DISABLE_RINGING: true,
                DISABLE_TRANSCRIPTION_SUBTITLES: true,
                DISABLE_VIDEO_BACKGROUND: true,
                ENABLE_DIAL_OUT: false,
                ENABLE_FEEDBACK_ANIMATION: false,
                HIDE_INVITE_MORE_HEADER: true,
                INITIAL_TOOLBAR_TIMEOUT: 1,
                JITSI_WATERMARK_LINK: '',
                LANG_DETECTION: false,
                LOCAL_THUMBNAIL_RATIO: 16 / 9,
                MAXIMUM_ZOOMING_COEFFICIENT: 1,
                MOBILE_APP_PROMO: false,
                SETTINGS_SECTIONS: [],
                SHOW_CHROME_EXTENSION_BANNER: false,
                SHOW_POWERED_BY: false,
                SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                TOOLBAR_ALWAYS_VISIBLE: false,
                TOOLBAR_BUTTONS: [],
                TOOLBAR_TIMEOUT: 1,
                VIDEO_QUALITY_LABEL_DISABLED: true,
                ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 1
            }
    };
    console.log(options.configOverwrite.startSilent);
    if (silent == "true") {
        options.configOverwrite.startSilent = true;
    }
    console.log(options.configOverwrite.startSilent);
    jitsi = (new JitsiMeetExternalAPI(domain, options));
    jitsi.on('passwordRequired', function () {
        jitsi.executeCommand('password', roomcode);
        console.log(roomcode);
    });

    jitsi.on('filmstripDisplayChanged', function (data) {
        if (data.visible == true) {
            jitsi.executeCommand('toggleFilmStrip');
        }
    });
   
    jitsi.executeCommand('toggleFilmStrip');
    console.log(options);
    console.log(jitsi);
    jitsi.allow = "“camera 'none'; microphone 'none'”"
}


function connect() {
    websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");
    websocket.onmessage = function (event) {
        data = JSON.parse(event.data);
        console.log(data);
        switch (data.api) {
            case API_login:
                if ("failure" in data) {
                    console.log("Login fail")
                }
                break;
            case API_livestream:
                livestream(data);
                break;
            case API_jwt:
                load(code, data);
        }
    };

    websocket.onopen = function (event) {
        console.log("Connected to server");
        websocket.send(JSON.stringify({ api: API_login, operation: "login", accessCode: token, room_num: roomnum }));
    };

    websocket.onclose = function (event) {
        console.log("Lost connection to server");
    };
}



function livestream(data) {
    if (data.operation == "update") {
        if (data.room == roomnum) {
            team_info = data.data;
            document.querySelector("#teamNum").innerHTML = team_info.team;
            document.querySelector("#teamName").innerHTML = team_info.name;
            document.querySelector("#teamLoc").innerHTML = team_info.location;
        }
        else {
            console.log("fail match");
        }
    }
    else if (data.operation == "code") {
        code = data.info.passcode;
        team_info = data.info.info;
        websocket.send(JSON.stringify({ api: API_jwt, operation: "get_jwt_from_livestream", room: "room" + roomnum}));
        document.querySelector("#teamNum").innerHTML = team_info.team;
        document.querySelector("#teamName").innerHTML = team_info.name;
        document.querySelector("#teamLoc").innerHTML = team_info.location;
    }
    else if (data.operation == "showScore") {
        if (data.room == roomnum) {
            if (data.scoresheet.comp == "viqc") {
                iqHandleSkills(data);
            }
            else {
                vrcHandleSkills(data);
            }
        }
    }
}

function iqHandleSkills(data) {
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
    setTimeout(function () { document.querySelector("#iqScoreModal").classList.remove("show"); }, 6000);
    
}

function vrcHandleSkills(data) {
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
    setTimeout(function () { document.querySelector("#scoreModal").classList.remove("show"); }, 6000);
}



