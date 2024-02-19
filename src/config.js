const mongoose = require("mongoose");
const connect=mongoose.connect("mongodb://localhost:27017/Login");

connect.then(() => {
    console.log("Database Connected Successfully");
})
.catch(() => {
    console.log("Database cannot be Connected");
})

const Loginschema = new mongoose.Schema({
    name: {
        type:String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const collection = new mongoose.model("users", Loginschema);

module.exports = collection;