const mongoose = require('mongoose')
const schema = mongoose.Schema
let vitalsSchema = {}
let vitalsModel

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

let vitalsService = {
    connect() {
        mongoose.connect('mongodb://localhost:27017/IOTProjectDB', function(err) {
            if (err == null) {
                console.log("Connected to Mongo DB")
                vitalsSchema = schema({
                    code:  String,
                    data: {
                        heartrate: Number,
                        o2: Number,
                        temperature: Number
                    }
                })
                let connection = mongoose.connection
                vitalsModel = connection.model("vitals", vitalsSchema)
            } else {
                console.log("Error connecting to Mongo DB")
            }
        })
    },
    createSession(c,callback) {
        let newVitals = new vitalsModel({
            code: c,
            data: {
                heartrate: 0,
                o2: 0,
                temperature: 0
            }
        })
        newVitals.save(callback)
    },
    updateData(c, hr, o2, temp, callback) {
        vitalsModel.findOneAndUpdate({code: c}, {
            data: {
                heartrate: hr,
                o2: o2,
                temperature: temp
            }
        }, callback)
    },
    getVitals(c, callback) {
        vitalsModel.find({code: c}, { data: 1 }, callback)
    }
}

module.exports = vitalsService