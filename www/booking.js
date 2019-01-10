let release = false;

function getBookingInfo(){
    if (release) {
        return {
            name: document.querySelector("#name").value,
            pass: document.querySelector("#pass").value,
            room: document.querySelector("#room").value,
            from: document.querySelector("#fromTime").value,
            to: document.querySelector("#toTime").value,
        }
    } else {
        return {
            name: "Daniel",
            pass: 123,
            room: "RAM",
            from: "Thu Jan 03 2019 14:36:03 GMT+0100 (Central European Standard Time)",
            to: "Thu Jan 03 2019 15:36:03 GMT+0100 (Central European Standard Time)"
        }
    }
}
(async () => {
    console.log(await postJSON("/api/booking", getBookingInfo()));
})();
function getJSON(url, callback) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function () {
            var status = xhr.status;
            if (status == 200) {
                if (callback) callback(null, xhr.response);
                resolve(xhr.response);
            } else {
                if (callback) callback(status);
                reject(status);
            }
        };
        // triggers if connection is refused
        xhr.onerror = function (e) {
            if (callback) callback(e);
            reject(e);
        };
        xhr.send();
    });
};
// callback(err, json)
function postJSON(url, data, callback) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.responseType = 'json';
        xhr.onload = function () {
            var status = xhr.status;
            if (status == 200) {
                if (callback) callback(null, xhr.response);
                resolve(xhr.response);
            } else {
                if (callback) callback(status);
                reject(status);
            }
        };
        // triggers if connection is refused
        xhr.onerror = function (e) {
            if (callback) callback(e);
            reject(e);
        };
        xhr.send(JSON.stringify(data));
    });
};