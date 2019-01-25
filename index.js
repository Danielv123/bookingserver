// webserver
var fs = require("fs-extra")
const moment = require("moment")
var express = require('express')
const bodyParser = require("body-parser")
var util = require('util');

// load config
let config = {}
try {
    config = JSON.parse(fs.readFileSync("config.json"))
} catch (e) { }

// setup logging to file
var log_file = fs.createWriteStream(`${__dirname}/debug.log`, { flags: 'a' })
var log_stdout = process.stdout

console.log = function (d) {
    log_file.write(`${moment().format("DD-MM-YY HH:mm")} | ${util.format(d)} \n`);
    log_stdout.write(`${moment().format("DD-MM-YY HH:mm")} | ${util.format(d)} \n`);
};
console.log("Server started")

// setup webserver
var app = express()
app.use(bodyParser.json())
app.use(express.static('www'))
// make sure all responses are sent as UTF-8 to support �,� and �
app.use(function (req, res, next) {
    res.setHeader('charset', 'utf-8')
    next()
});
app.use(function (req, res, next) {
    if(req.method == "POST") console.log(`HIT ${req.originalUrl} with ${JSON.stringify(req.body)}`)
    next()
})
app.listen(config.port || 3000)
console.log(`Listening on port ${config.port || 3000}`)

let db = JSON.parse(fs.readFileSync("db.json"));

app.get('/api/rooms', function (req, res) {
    res.send(db.rooms);
});
app.post("/api/auth", (req, res) => {
    if (req.body && req.body.PIN) {
        let user = db.users.find(usr => usr.PIN == req.body.PIN)
        if (user) {
            res.send({
                ok: true,
                msg: "Authenticated",
                authenticated: authenticated(req.body.PIN),
                user: {
                    name: user.name,
                    displayName: user.displayName,
                }
            })
        } else {
            res.send({
                ok: false,
                msg: "Unauthenticated"
            })
        }
    } else {
        res.send({
            ok: false,
            msg: "Did not find PIN in req.body"
        })
    }
})
app.post("/api/booking", async (req, res) => {
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
                await saveDatabase();
                console.log("Booked room"); console.log(booking)
                res.send({
                    ok: true,
                    msg: "Booked room",
                    data: booking
                });
            } else {
                console.log("Room already booked for that period")
                res.send({
                    ok: false,
                    msg: "Room already booked for that period"
                })
            }
        } else {
            console.log("Did not find room")
            res.send({
                ok: false,
                msg: "Did not find room"
            })
        }
    } else {
        console.log("Auth/verification failed")
        res.send({
            ok: false,
            msg: "Auth/verification failed",
            data: [!!req.body, !!req.body.name, !!authenticated(req.body.pass), !!req.body.room, !!req.body.from, !!req.body.to, !!moment(req.body.from).isValid(), !!moment(req.body.to).isValid()]
        })
    }
})
app.post("/api/unbook", async (req, res) => {
    if (req.body.PIN &&
        req.body.room &&
        typeof req.body.room == "string" &&
        req.body.from &&
        moment(req.body.from).isValid() &&
        authenticated(req.body.PIN)) {
		let roomDb = db.rooms.find(r => r.name == req.body.room)
        if (roomDb) {
            let didUnbook = false
            roomDb.booking = roomDb.booking.filter(book => {
                if (book.from == req.body.from) {
                    console.log("Unbooked room"); console.log(book)
                    res.send({
                        ok: true,
                        msg: "Unbooked room"
                    })
                    didUnbook = true
                    return false
                } else {
                    return true
                }
            })
            await saveDatabase()
            if (!didUnbook) {
                console.log("Didn't unbook, couldn't find reservation")
                res.send({
                    ok: false,
                    msg: "Didn't unbook, couldn't find reservation"
                })
            }
        } else {
            console.log("Room not found")
            res.send({
                ok: false,
                msg: "Room not found"
            })
        }
    } else {
        console.log("unauthenticated")
        res.send({
            ok: false,
            msg: "unauthenticated"
        })
    }
});
app.get("/api/users", (req, res) => {
    res.send(db.users.map(user => {
        let tempUser = JSON.parse(JSON.stringify(user))
        delete tempUser.PIN
        return tempUser
    }))
})
app.post("/api/addUser", async (req, res) => {
    if (req.body && req.body.PIN && authenticated(req.body.PIN) == 2
        && req.body.newUser
        && req.body.newUser.PIN
        && req.body.newUser.name
        && req.body.newUser.displayName) {
        if (isPinUnique(req.body.newUser.PIN)) {
            db.users.push({
                PIN: Number(req.body.newUser.PIN),
                name: req.body.newUser.name,
                displayName: req.body.newUser.displayName,
                admin: req.body.newUser.admin,
            })
            await saveDatabase()
            console.log("New user created")
            res.send({
                ok: true,
                msg: "New user created",
            })
        } else {
            console.log("PIN unavailable. Please pick a different PIN.")
            res.send({
                ok: false,
                msg: "PIN unavailable. Please pick a different PIN."
            })
        }
    } else {
        console.log("Input validation/auth failed")
        res.send({
            ok: false,
            msg: "Input validation/auth failed",
        })
    }
})
app.post("/api/removeUser", async (req, res) => {
    if (req.body.PIN &&
        authenticated(req.body.PIN) == 2 &&
        req.body.name) {
        db.users = db.users.filter(user => {
            if (user.name == req.body.name) {
                console.log("Deleted user")
                console.log(user)
                res.send({
                    ok: true,
                    msg: `Deleted user ${user.name} (${user.displayName})`
                })
                return false
            } else {
                return true
            }
        })
        await saveDatabase()
    } else {
        console.log("Unauthenticated")
        res.send({
            ok: false,
            msg: "Unauthenticated"
        })
    }
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
function isPinUnique(PIN) {
    if (!PIN || isNaN(Number(PIN))) {
        throw new Error("We aren't we getting a PIN?" + PIN)
    } else {
        return !db.users.filter(user => user.PIN === Number(PIN)).length
    }
}
function authenticated(PIN = "nope") {
    PIN = Number(PIN)
    if (isNaN(Number(PIN))) {
        return 0;
    } else {
        var PIN = Number(PIN)
    }
    let users = db.users.filter(user => user.PIN === PIN);
    if (users.length > 1) {
        console.log(new Error("Yikes, there should never be duplicate PINs! (see PIN " + PIN + ")"))
        throw new Error("Yikes, there should never be duplicate PINs! (see PIN " + PIN + ")")
    } else if (users.length < 1) {
        return 0;
    } else if (users[0].admin) {
        return 2;
    } else {
        return 1;
    }
}
async function saveDatabase() {
    return new Promise((resolve, reject) => fs.writeFile("db.json", JSON.stringify(db, null, 4), resolve))
}
function getUserByName(name) {
    return db.users.find(user => user.name == name)
}
async function deleteOldBookings() {
    db.rooms.forEach(room => {
        // filter out bookings that ended before the current time
        room.booking = room.booking.filter(booking => {
            if (moment(booking.to).isAfter(moment())) return true
            console.log("Removed old booking:");console.log(booking)
            return false
        })
    })
    await saveDatabase();
}
setInterval(deleteOldBookings, 1000 * 60 * 5) // clear old bookings every 5 minutes
