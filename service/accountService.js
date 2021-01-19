const mongoose = require('mongoose')
const schema = mongoose.Schema
let accountSchema = {}
let accountModel

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

let accountService = {
    connect() {
        mongoose.connect('mongodb://localhost:27017/IOTProjectDB', function(err) {
            if (err == null) {
                console.log("Connected to Mongo DB")
                    //initialize values
                accountSchema = schema({
                    name: String,
                    email: String,
                    password: String,
                    token: String
                })
                var connection = mongoose.connection
                accountModel = connection.model("accounts", accountSchema)
            } else {
                console.log("Error connecting to Mongo DB")
            }
        })
    },
    login(email, password, callback) {
        accountModel.findOne({ email: email, password: password }, callback)
    },
    register(name, email, password, callback) {
        let newAccount = new accountModel({
            name: name,
            email: email,
            password: password
        })
        newAccount.save(callback)
    },
    updateToken(id, token, callback) {
        accountModel.findByIdAndUpdate(id, { token: token }, callback)
    },
    removeToken(id, callback) {
        accountModel.findByIdAndUpdate(id, { $unset: { token: 1 } }, callback)
    },
    getUserfromToken(token, callback) {
        accountModel.find({ token: token }, callback)
    },
    checkToken(token, callback) {
        accountModel.findOne({ token: token }, callback)
    },
    removeToken(id, callback) {
        accountModel.findByIdAndUpdate(id, { $unset: { token: 1 } }, callback)
    }
}

module.exports = accountService