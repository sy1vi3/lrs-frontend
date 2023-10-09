let data = { "client_id": 8, "client_secret": "", "redirect_uri": "https://console.liveremoteskills.org/oauth/login", "grant_type": "authorization_code", "code": ""};
window.post = function (url, data) {
    return fetch(url, { method: "POST", body: JSON.stringify(data) });
}
function init() {
    x = post("https://test.robotevents.com/oauth/token", data);
    console.log(x);
}