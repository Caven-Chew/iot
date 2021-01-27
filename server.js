const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, { debug: true })
const crypto = require('crypto')
const bodyParser = require('body-parser')
const expressLayouts = require('express-ejs-layouts')
const accountService = require('./service/accountService')
const bookingService = require('./service/bookingService')
const doctorService = require('./service/doctorService')
const vitalsService = require('./service/vitalsService')

const views = ["login", "register", "booking", "addbooking",
    "doctorlogin", "doctorregister", "doctorbookings"
]

accountService.connect()
bookingService.connect()
doctorService.connect()
vitalsService.connect()

app.use(cookieParser())
app.use('/peerjs', peerServer)
app.use(express.static('public'))
app.use(expressLayouts)

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
    extended: true
}))

//General

app.get('/', function(req, res) {
    res.render(__dirname + "/views/doctorlogin")
})

app.get('/css/*', function(req, res)  {
    res.sendFile(__dirname+"/views/"+req.originalUrl);
});

app.get('/:name', function(req, res) {
    let { name } = req.params
    if (views.includes(name)) {
        res.render(name + ".ejs")
    } else {
        res.send("Error 404. This page does not exist!")
    }
})

//Account

app.post('/api/login', function(req, res) {
    let { email, password } = req.body
    accountService.login(email, password, function(err, user) {
        if (err) {
            res.send({ message: "Login unsucessful! Please try again." })
        } else {
            if (user == null) {
                res.send({ message: "Login unsucessful! Please try again." })
            } else {
                let strToHash = user.name + Date.now()
                let token = crypto.createHash('md5').update(strToHash).digest('hex')
                accountService.updateToken(user._id, token, function(err, user) {
                    if (err || !user) {
                        res.send({ message: "Login unsucessful! Please try again." })
                    } else {
                        res.send({ data: 'Login successful!', token: token, name: user.name, id: user.id })
                    }
                })
            }
        }
    })
})

app.get("/api/logout", function(req, res) {
    var token = req.query.token
    if (token == undefined) {
        res.status(401).send({ message: "No tokens are provided" })
    } else {
        accountService.checkToken(token, function(err, user) {
            if (err || user == null) {
                res.send({ message: "Invalid token provided" })
            } else {
                accountService.removeToken(user._id, function(err, myuser) {
                    if (err) {
                        res.send({ message: "Logout failed" })
                    } else if (!myuser) {
                        res.send({ message: "Logout failed" })
                    } else {
                        res.send({ data: "Logout successfully" })
                    }
                })
            }
        })
    }
})

app.post('/api/register', function(req, res) {
    const { name, email, password, confirmpassword } = req.body
    if (password === confirmpassword) {
        accountService.register(name, email, password, (err, acc) => {
            if (err || !acc) {
                res.send({ message: err })
            } else {
                res.send({ data: acc })
            }
        })
    } else {
        res.send({ message: "Registration unsucessful. Please try again" })
    }
})

app.post('/api/doctor/login', function(req, res) {
    const { email, password } = req.body
    try {
        doctorService.login(email, password, function(err, account) {
            if (err) {
                res.send({ message: "Login unsucessful. Please try again" })
            } else {
                if (account == null || !account) {
                    res.send({ message: "Login unsucessful. Please try again" })
                } else {
                    let strToHash = "" + account.name + Date.now()
                    var token = crypto.createHash('md5').update(strToHash).digest('hex')
                    doctorService.updateToken(account._id, token, (err, user) => {
                        if (err) {
                            res.send({ message: "Login unsucessful. Please try again" })
                        } else {
                            res.send({ data: 'Success', token: token, name: user.name, id: user._id })
                        }
                    })
                }
            }
        })
    } catch (error) {
        res.send({ message: "Login unsucessful. Please try again" })
    }
})

app.get("/api/doctor/logout", (req, res) => {
    var token = req.query.token
    if (token == undefined) {
        res.send({ message: "No tokens are provided" })
    } else {
        doctorService.checkToken(token, function(err, user) {
            if (err || user == null) {
                res.send({ message: "Invalid token provided" })
            } else {
                doctorService.removeToken(user._id, function(err, myuser) {
                    if (err) {
                        res.send({ message: "Logout failed" })
                    } else if (!myuser) {
                        res.send({ message: "Logout failed" })
                    } else {
                        res.send({ data: "Logout successfully" })
                    }
                })
            }
        })
    }
})

app.post('/api/doctor/register', function(req, res) {
    const { name, email, password } = req.body
    doctorService.register(name, email, password, (err, account) => {
        if (err) {
            req.send({ message: err })
        } else if (!account) {
            req.send({ message: "Error registering account!" })
        } else {
            let strToHash = "" + account.name + Date.now()
            var token = crypto.createHash('md5').update(strToHash).digest('hex')
            doctorService.updateToken(account._id, token, (err, user) => {
                if (err) {
                    res.send({ message: "Login unsucessful. Please try again" })
                } else {
                    res.send({ data: 'Success', token: token, name: user.name, id: user._id })
                }
            })
        }
    })
})

app.get('/api/doctors/all', (req, res) => {
    docList = []
    doctorService.getAllDoctors((err, doctors) => {
        if (!err) {
            doctors.map(doctor => {
                docList.push({
                    name: doctor.name,
                    email: doctor.email,
                    id: doctor._id
                })
            })
            res.send({ data: docList })
        } else {
            res.send({ message: "error!" })
        }
    })
})

//Booking

app.post('/api/addbooking', (req, res) => {
    const { date, time, doctorId, patientId, patientName } = req.body
    doctorService.getDoctor(doctorId, (err, doctor) => {
        if (!err) {
            if (doctor[0]) {
                bookingService.addBooking(date, time, doctorId, doctor[0].name, patientId, patientName)
                res.send({ data: "Booked Successfully!" })
            } else {
                res.send({ message: "Booked Failed!" })
            }
        } else {
            res.send({ message: "Booked Failed!" })
        }
    })
})

app.get('/api/getbookingbypatientid/:id', (req, res) => {
    let { id } = req.params
    bookingService.getBookingsByPatient(id, (err, booking) => {
        if (err) {
            res.send({ message: err })
        } else if (!booking) {
            res.send({ message: "Error getting booking record" })
        } else {

            res.send({ data: booking })
        }
    })
})

app.get('/api/getbookingbydoctorid/:id', (req, res) => {
    let { id } = req.params
    bookingService.getBookingsByDoctor(id, function(err, bookings) {
        if (err) {
            res.send({ message: "Error fetching data!" })
        } else if (!bookings) {
            res.send({ message: "No data fetched!" })
        } else {
            res.send({ data: bookings })
        }
    })
})

//Video Service

app.post('/api/videoservice/start/:bookingId', (req, res) => {
    const { bookingId } = req.params
    bookingService.startVideoSession(bookingId, (err, session) => {
        if (err) {
            res.send({ message: "Fail to start!" })
        } else if (!session || session.n === 0) {
            res.send({ message: "Fail to start!" })
        } else {
            res.send({ data: "Call started!" })
        }
    })
})

app.post('/api/videoservice/end/:bookingId', (req, res) => {
    const { bookingId } = req.params
    bookingService.endVideoSession(bookingId, (err, session) => {
        if (err) {
            res.send({ message: "Fail to stop!" })
        } else if (!session || session.n === 0) {
            res.send({ message: "Fail to stop!" })
        } else {
            res.send({ data: "Call Stopped!" })
        }
    })
})

//Vitals

app.post('/open/api/newsession/:code', (req, res) => {
    const { code } = req.params
    vitalsService.createSession(code, (err, session) => {
        if (!err) {
            res.send({ data: "Session created" })
        } else {
            res.send({ message: "Error creating session" })
        }
    })
})

app.get('/open/api/:code', (req, res) => {
    const { code } = req.params
    bookingService.getBookingById(code, (err, bk) => {
        if (err) {
            res.send({ message: err })
        } else {
            accountService.getKit(bk.patientId, (err, kitid) => {
                if (err) {
                    res.send({ message: err })
                } else {
                    vitalsService.getVitals(kitid.arKit, (err, vitals) => {
                        if (err) {
                            res.send({ message: err })
                        } else {
                            res.send({ data: vitals })
                        }
                    })
                }

            })
        }

    })
})

app.post('/open/api/:code', (req, res) => {
    const { code } = req.params
    const { heartrate, oxygen, temperature } = req.body
    // bookingService.getBookingById(code, (err, bk) => {
    //     if (err) {
    //         res.send({ message: err })
    //     } else {
    //         accountService.getKit(bk.patientId, (err, kitid) => {
    //             if (err) {
    //                 res.send({ message: err })
    //             } else {
                    vitalsService.updateData(code, heartrate, oxygen, temperature, (err, session) => {
                        if (!err) {
                            res.send({ data: "Successful posting data" })
                        } else {
                            res.send({ message: "Error posting data" })
                        }
                    })
        //         }

        //     })
        // }

    // })
})

app.get('/open/api/clear/:code', (req, res) => {
    const { code } = req.params
    bookingService.getBookingById(code, (err, bk) => {
        if (err) {
            res.send({ message: err })
        } else {
            accountService.getKit(bk.patientId, (err, kitid) => {
                if (err) {
                    res.send({ message: err })
                } else {
                    vitalsService.clearData(kitid.arKit, (err, session) => {
                        if (!err) {
                            res.send({ data: "Successful posting data" })
                        } else {
                            res.send({ message: "Error posting data" })
                        }
                    })
                }

            })
        }

    })
})

app.post('/open/api/kit/:userid', (req, res) => {
    const { userid } = req.params
    const { arkit } = req.body
    accountService.setKit(userid, arkit, (err, acc) => {
        if (err) {
            res.send({ message: "Error posting data" })
        } else {
            res.send({ data: acc, kit: arkit })
        }
    })
})

app.get('/open/api/kit/:userid', (req, res) => {
    const { userid } = req.params
    accountService.getKit(userid, (err, acc) => {
        if (err) {
            res.send({ message: "Error posting data" })
        } else {
            res.send({ data: acc })
        }
    })
})

//Video call

app.get('/video/:room', (req, res) => {
    res.render('room', { roomId: req.params.room, layout: "room" })
})

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId)
        socket.to(roomId).broadcast.emit('user-connected', userId)

        socket.on('message', (message) => {
            io.to(roomId).emit('createMessage', message, userId)
        })
        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId)
        })
    })
})

const PORT = 5000

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))