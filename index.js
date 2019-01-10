// webserver
var fs = require("fs-extra")
const moment = require("moment")
var express = require('express')
const bodyParser = require("body-parser")
var app = express()
app.use(bodyParser.json())
app.use(express.static('www'))

let db = {
    rooms: [{
        name: "Anode",
        roomNumber: 136,
        desc: "",
        booking: [],
    },{
        name: "Katode",
        roomNumber: 139,
        desc: "",
        booking: [],
    },{
        name: "Coloumb",
        roomNumber: 148,
        desc: "",
        booking: [],
    },{
        name: "AC",
        roomNumber: 119,
        desc: "",
        booking: [],
    },{
        name: "DC",
        roomNumber: 118,
        desc: "",
        booking: [],
    },{
        name: "RAM",
        roomNumber: 110,
        desc: "Inne på VG1",
        booking: [],
    },{
        name: "Rho",
        roomNumber: 144,
        desc: "Lærerenes rom",
        booking: [],
    },],
};
try {
    db = JSON.parse(fs.readFileSync("db.json"));
} catch (e) { }

app.get('/api/rooms', function (req, res) {
    res.send(db.rooms);
});
app.post("/api/booking", (req, res) => {
    if (req.body && req.body.name &&
        req.body.pass &&
        Number(req.body.pass) == 123 &&
        req.body.room && req.body.from && req.body.to && moment(req.body.from).isValid() && moment(req.body.to).isValid()) {
        let rom = db.rooms.filter(x => x.name == req.body.room)[0];
        if (rom) {
            let displayTime = moment(req.body.from).format('DD/MM, hh:mm')
            let booking = {
                name: req.body.name,
                from: req.body.from,
                to: req.body.to,
                displayTime,
            };
            rom.booking.push(booking);
            res.send({
                ok: true,
                msg: "Booked room",
                data: booking
            });
            console.log("booked room")
        } else {
            res.send({
                ok: false,
                msg: "Did not find room;"
            })
        }
    } else {
        res.send({
            ok: false,
            msg: "Auth/verification failed"
        });
    }
})

app.listen(3000)
