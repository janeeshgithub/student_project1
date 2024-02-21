const mongoose = require("mongoose");
require('dotenv').config();
const connect = mongoose.connect(process.env.MONGO_URL);

connect.then(() => {
    console.log("Database Connected Successfully");
}).catch(() => {
    console.log("Database cannot be Connected");
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type:String,
        required: true
    },
    image: { 
        type: String
    },
    password: {
        type: String,
        required: true
    }
});

// pdf schema
const pdfSchema = new mongoose.Schema({
    originalname: {
        type: String,
        required: true
    },
    path: {
        type: String,
    },
    uploaderName: {
        type: String,
        required: true
    }
});

const documentSchema = new mongoose.Schema({
    originalname: {
        type: String,
        required: true
    },
    path: {
        type: String,
    },
    uploaderName: {
        type: String,
        required: true
    }
});

const User = new mongoose.model("users", userSchema);
const Pdf = new mongoose.model("pdfs", pdfSchema);
const Document = new mongoose.model("documents", documentSchema);

module.exports = { User, Pdf,Document};
