const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, { debug: true })
const crypto = require('crypto');
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
    res.render(__dirname + "/views/login.ejs")
})

app.get('/:name', function(req, res) {
    let { name } = req.params
    if (views.includes(name)) {
        res.render(name)
    } else {
        res.send("Error 404. This page doed not exist!")
    }
})

//Account

app.post('/api/login', function(req, res) {
    let { email, password } = req.body;
    accountService.login(email, password, function(err, user) {
        if (err) {
            res.send({ message: "Login unsucessful. Please try again later" });
        } else {
            if (user == null) {
                res.send({ message: "Login unsucessful. Please try again later" });
            } else {
                let strToHash = user.name + Date.now();
                let token = crypto.createHash('md5').update(strToHash).digest('hex');
                accountService.updateToken(user._id, token, function(err, user) {
                    res.status(200).json({ 'message': 'Login successful.', 'token': token, 'name': user.name, 'id': user.id });
                });
            }
        }
    })
})

app.get("/api/logout", function(req, res) {
    var token = req.query.token;
    if (token == undefined) {
        res.status(401).send("No tokens are provided");
    } else {
        accountService.checkToken(token, function(err, user) {
            if (err || user == null) {
                res.status(401).send("Invalid token provided");
            } else {
                accountService.removeToken(user._id, function(err, user) {
                    res.status(200).send("Logout successfully")
                });
            }
        })
    }
})

app.post('/api/register', function(req, res) {
    const { name, email, password, confirmpassword } = req.body
    if (password === confirmpassword) {
        accountService.register(name, email, password, (err, acc) => {
            if (err) {
                res.send({ message: err })
            } else {
                res.send({ data: acc })
            }
        })
    } else {
        res.send({ message: err })
    }
})

app.post('/api/doctor/login', function(req, res) {
    const { email, password } = req.body
    try {
        doctorService.login(email, password, function(err, account) {
            console.log(account)
            console.log(account[0]._id)
            res.cookie('id', account._id).redirect('back')
        })
    } catch (error) {
        console.log(error)
    }
})

app.post('/api/doctor/register', function(req, res) {
    const { name, email, password, confirmpassword } = req.body
    if (password === confirmpassword) {
        doctorService.register(name, email, password)
        res.redirect('/login')
    } else {
        res.redirect('back')
    }
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
            res.send(docList)
        } else {
            res.send({ message: "error!" })
        }
    })
})

//Booking

app.post('/api/addbooking', (req, res) => {
    const { date, time, doctorId, patientId, patientName } = req.body
    console.log(req.body)
    doctorService.getDoctor(doctorId, (err, doctor) => {
        if (!err) {
            if (doctor[0]) {
                console.log(date, time, doctorId, doctor[0].name, patientId, patientName)
                bookingService.addBooking(date, time, doctorId, doctor[0].name, patientId, patientName)
                res.send({ message: "Booked Successfully!" })
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
        res.send(booking)
    })
})

app.get('/api/getbookingbydoctorid/:id', (req, res) => {
    let { id } = req.params
    bookingService.getBookingsByDoctor(id, function(err, bookings) {
        res.send(bookings);
    })
})

//Doctor Service

app.post('/api/videoservice/start/:bookingId', (req, res) => {
    const { bookingId } = req.params
    bookingService.startVideoSession(bookingId, (err) => {
        if (err) {
            res.send({ message: "Fail to start!" })
        } else {
            res.send({ message: "Call started!" })
        }

    })
})

app.post('/api/videoservice/end/:bookingId', (req, res) => {
    const { bookingId } = req.params
    bookingService.endVideoSession(bookingId, (err) => {
        if (err) {
            res.send({ message: "Fail to stop!" })
        } else {
            res.send({ message: "Call stoped!" })
        }
    })
})

//Vitals

app.get('/open/api/newsession', (req, res) => {
    vitalsService.createSession((err, session) => {
        if (!err) {
            res.send(session)
        } else {
            res.send({ message: "Error starting session" })
        }
    })
})

app.post('/open/api/:id', (req, res) => {
    const { id } = req.params
    const { heartrate, oxygen, temperature } = req.body
    vitalsService.updateData(id, heartrate, oxygen, temperature, (err, session) => {
        if (!err) {
            res.send({ message: "Successful posting data" })
        } else {
            res.send({ message: "Error posting data" })
        }
    })

})

//Video chat

app.get('/video/:room', (req, res) => {
    // console.log('login: ', req.cookies.id)
    res.render('room', { roomId: req.params.room })
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