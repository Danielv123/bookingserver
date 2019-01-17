// webserver
var fs = require("fs-extra")
const moment = require("moment")
var express = require('express')
const bodyParser = require("body-parser")
var app = express()
app.use(bodyParser.json())
app.use(express.static('www'))
// make sure all responses are sent as UTF-8 to support æ,ø and å
app.use(function (req, res, next) {
    res.setHeader('charset', 'utf-8')
    next()
});

let db = JSON.parse(fs.readFileSync("db.json"));

app.get('/api/rooms', function (req, res) {
    res.send(db.rooms);
});
app.post("/api/booking", (req, res) => {
    // validate input (otherwise reject request)
    if (req.body && req.body.name
        && authenticated(req.body.pass)
        && req.body.room
        && req.body.from
        && req.body.to
        && moment(req.body.from).isValid() && moment(req.body.to).isValid()) {
        // try adding reservation
        let rom = db.rooms.filter(x => x.name == req.body.room)[0];
        if (rom) {
            let displayTime = moment(req.body.from).format('DD/MM, hh:mm')
            let booking = {
                name: req.body.name,
                from: req.body.from,
                to: req.body.to,
                displayTime,
            };
            // check that it isn't already booked
            if (!rom.booking.find(book => book.from == booking.from)) {
                rom.booking.push(booking);
                res.send({
                    ok: true,
                    msg: "Booked room",
                    data: booking
                });
            } else {
                res.send({
                    ok: false,
                    msg: "Room already booked for that period"
                })
            }
            console.log("booked room")
        } else {
            res.send({
                ok: false,
                msg: "Did not find room"
            })
        }
    } else {
        res.send({
            ok: false,
            msg: "Auth/verification failed"
        })
    }
})
app.get("/api/users", (req, res) => {
    res.send(db.users.map(user => {
        let tempUser = JSON.parse(JSON.stringify(user))
        delete tempUser.PIN
        return tempUser
    }))
})
app.post("/api/addUser", (req, res) => {
    if (req.body && req.body.pass && authenticated(req.body.pass) == 2
        && req.body.newUser
        && req.body.newUser.PIN
        && req.body.newUser.name
        && req.body.newUser.displayName) {

    } else {
        res.send({
            ok: false,
            msg: "Input validation/auth failed",
        })
    }
})
app.post("/api/removeUser", (req, res) => {
    
})
app.post("/api/editUser", (req, res) => {
    // do not allow duplicate PINs as we want to use them for usernameless logons
    console.log(req.body);
    if (req.body.name &&
        typeof req.body.name == "string" &&
        req.body.newDisplayName &&
        typeof req.body.newDisplayName == "string" &&
        typeof req.body.newPin == "string" &&
        authenticated(req.body.PIN) == 2) {

        // change name
        getUserByName(req.body.name).displayName = req.body.newDisplayName

        // change PIN if asked for
        let pinMsg = "";
        if (req.body.newPin && !isNaN(Number(req.body.newPin))){
            if (isPinUnique(req.body.newPin)) {
                pinMsg = "new PIN was unique, perform changes"
                console.log("User before change: "+JSON.stringify(getUserByName(req.body.name)))
                getUserByName(req.body.name).PIN = Number(req.body.newPin)
                console.log("User after change:  " + JSON.stringify(getUserByName(req.body.name)))
            } else {
                pinMsg = "new PIN was not unique, not changing anything"
            }
        }
        res.send({
            ok: true,
            msg: "name updated, "+pinMsg
        })
    } else {
        res.send({
            ok: false,
            msg: "Validation/authentication failed. Make sure you are an admin"
        })
    }
})
app.post("/api/admin/promote", (req, res) => {
    
})
app.post("/api/admin/demote", (req, res) => {
    
})
function isPinUnique(PIN) {
    if (!PIN || isNaN(Number(PIN))) {
        throw new Error("We aren't we getting a PIN?" + PIN)
    } else {
        return !db.users.filter(user => user.PIN === Number(PIN)).length
    }
}
function authenticated(PIN = "nope") {
    if (isNaN(Number(PIN))) {
        return 0;
    } else {
        var PIN = Number(PIN)
    }
    let users = db.users.filter(user => user.PIN === PIN);
    if (users.length > 1) {
        throw new Error("Yikes, there should never be duplicate PINs! (see PIN " + PIN + ")")
    } else if (users.length < 1) {
        return 0;
    } else if (users[0].admin) {
        return 2;
    } else {
        return 1;
    }
}
function getUserByName(name) {
    return db.users.find(user => user.name == name)
}
app.listen(3000)
