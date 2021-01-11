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
    createSession(callback) {
        let newVitals = new vitalsModel({
            data: {
                heartrate: 0,
                o2: 0,
                temperature: 0
            }
        })
        newVitals.save(callback)
    },
    updateData(id, hr, o2, temp, callback) {
        vitalsModel.findByIdAndUpdate(id, {
            data: {
                heartrate: hr,
                o2: o2,
                temperature: temp
            }
        }, callback)
    }
}

module.exports = vitalsService