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
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomnum = urlParams.get('room');
const token = urlParams.get('token');


var jitsi

function init() {
    var script = document.createElement("script")
    script.type = "text/javascript";
    script.src = "https://connect.liveremoteskills.org/external_api.js";
    document.getElementsByTagName("head")[0].appendChild(script);
    connect();
}

function load(roomcode) {
    domain = "connect.liveremoteskills.org";
    const options = {
        roomName: "room" + roomnum,
        userInfo: {
            email: '',
            displayName: 'Livestream'
        },
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
            hiddenDomain: "connect.liveremoteskills.org"
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
}


function connect() {
    websocket = new WebSocket("wss://ecsrv.liveremoteskills.org:443");
    websocket.onmessage = function (event) {
        data = JSON.parse(event.data);
        switch (data.api) {
            case API_login:
                if ("failure" in data) {
                    console.log("Login fail")
                }
            case API_livestream:
                livestream(data);
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
        code = data.passcode;
        load(code);
    }
}



