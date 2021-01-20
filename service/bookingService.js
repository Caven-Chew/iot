const mongoose = require('mongoose')
const schema = mongoose.Schema
let bookingSchema = {}
let bookingModel

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

let bookingService = {
    connect() {
        mongoose.connect('mongodb://localhost:27017/IOTProjectDB', function(err) {
            if (err == null) {
                console.log("Connected to Mongo DB")
                    //initialize values
                bookingSchema = schema({
                    date: String,
                    time: String,
                    doctorId: String,
                    doctorName: String,
                    patientId: String,
                    patientName: String,
                    status: String
                })
                var connection = mongoose.connection
                bookingModel = connection.model("bookings", bookingSchema)
            } else {
                console.log("Error connecting to Mongo DB")
            }
        })
    },
    addBooking(date, time, doctorId, dotorName, patientId, patientName, callback) {
        let newBooking = new bookingModel({
            date: date,
            time: time,
            doctorId: doctorId,
            doctorName: dotorName,
            patientId: patientId,
            patientName: patientName,
            status: 'Booked'
        })
        newBooking.save(callback)
    },
    getBookingsByPatient(patientId, callback) {
        bookingModel.find({ patientId: patientId }, callback)
    },
    getBookingById(id, callback) {
        bookingModel.findById(id, callback)
    },
    getBookingsByDoctor(doctorId, callback) {
        bookingModel.find({ doctorId: doctorId }, callback)
    },
    startVideoSession(bookingId, callback) {
        bookingModel.updateOne({ _id: bookingId }, { $set: { status: "progress" } }, callback)
    },
    endVideoSession(bookingId, callback) {
        bookingModel.updateOne({ _id: bookingId }, { $set: { status: "closed" } }, callback)
    }
}

module.exports = bookingService