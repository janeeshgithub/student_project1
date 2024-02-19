const express = require("express");
const path = require("path");
const http = require("http");
const session = require("express-session");
const { User, Pdf} = require("./config");  // Import both User and Pdf models
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const fileUpload = require('express-fileupload');
const socketIO = require("socket.io");
const cors = require('cors');
require('dotenv').config();


const app = express();
const server = http.createServer(app); // Use http.createServer to create the server
const io = socketIO(server);
const port = process.env.PORT;
app.use(cors());

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(express.static("src/uploads"));
app.set("view engine", "ejs");
app.set('views, "path.join("../views',"views");
//app.set('views, "path.join("c:\Users\chith\Videos\web development\student_project',"views");
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
    })
);
//284aab7361fc56082ab0eb22442b014f2b667daae5736e7f5512b81ba66e7926;
app.use(async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.user = user; // Make user data available in response locals
        } catch (error) {
            console.error(error);
        }
    }
    next();
});

app.get("/", (req, res) => res.render("frontpage"));
app.get("/courses", (req, res) => res.render("courses"));
app.get("/about", (req, res) => res.render("about"));
app.get("/teachers", (req, res) => res.render("teachers"));
app.get("/action", (req, res) => res.render("action"));
app.get("/index", (req, res) => {
    //
    const user = res.locals.user;
    res.render("index", { user });
});
app.get("/contact", (req, res) => res.render("contact"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/upload", (req, res) => res.render("upload"));
app.get("/home",(req,res)=>res.render("home"));
app.get("/profile",(req,res)=>res.render("profile"));


app.get("/pdfs", async (req, res) => {
    try {
        const pdfs = await Pdf.find();
        res.render("pdfPlaylist", { pdfs });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});    


// Signup route
app.post("/signup",upload.single("profileImage"), async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password,
        email: req.body.email,
        image:req.file.filename
    }

    try {
        const existingUser = await User.findOne({ name: data.name });

        if (existingUser) {
            return res.send('User already exists. Please choose a different username.');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword;

        const userdata = await User.create(data);
        console.log(userdata);
        res.render("login"); // You can redirect to a different page after signup
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Login route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ name: username });
        if (!user) {
            return res.send("User name cannot be found");
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.send("Wrong Password");
        }

        // Store user ID in the session
        req.session.userId = user._id;

        // Pass user data to profile.ejs template, including _id
        res.render("home", { user });
    } catch (error) {
        console.error(error);
        res.send("Wrong Details");
    }
});


// Upload PDF route
app.get("/upload", (req, res) => res.render("upload"));

app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        const pdfData = {
            originalname: req.file.originalname,
            path: req.file.path,
            uploaderName: res.locals.user ? res.locals.user.name : "Anonymous",
        };

        // Save the PDF data to the MongoDB collection
        const pdfDocument = await Pdf.create(pdfData);

        res.send(`PDF uploaded successfully. ID: ${pdfDocument._id}`);
    } catch (error) {
        console.error(error);
        res.send("Error uploading PDF");
    }
});
// Inside your Express route handling the /material endpoint
app.get("/material", async (req, res) => {
    try {
      const start = parseInt(req.query.start) || 0;
      const end = parseInt(req.query.end) || 2;
  
      const pdfs = await Pdf.find();
      console.log("PDFs from database:", pdfs);
  
      // Pass start and end values to the template
      res.render("material", { pdfs, start, end });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
});

app.get("/material/:id", async (req, res) => {
    try {
        const pdfId = req.params.id;
        const pdf = await Pdf.findById(pdfId);

        if (!pdf) {
            return res.status(404).send("PDF not found");
        }

        res.sendFile(pdf.path);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


app.get("/uploads/:filename", (req, res) => {
    const filePath = path.join(__dirname, "uploads", req.params.filename);
    res.type("application/pdf");
    res.sendFile(filePath);
  });
  
  const userConnections = [];

  io.on("connection", (socket) => {
      console.log("socket id is ", socket.id);
  
      socket.on("userconnect", (data) => {
          console.log("userconnect", data.displayName, data.meetingid);
          const other_users = userConnections.filter((p) => p.meeting_id == data.meetingid);
  
          userConnections.push({
              connectionId: socket.id,
              user_id: data.displayName,
              meeting_id: data.meetingid,
          });
  
          const userCount = userConnections.length;
          console.log(userCount);
  
          other_users.forEach((v) => {
              socket.to(v.connectionId).emit("inform_others_about_me", {
                  other_user_id: data.displayName,
                  connId: socket.id,
                  userNumber: userCount,
              });
          });
  
          socket.emit("inform_me_about_other_user", other_users);
      });
  
      socket.on("SDPProcess", (data) => {
          socket.to(data.to_connid).emit("SDPProcess", {
              message: data.message,
              from_connid: socket.id,
          });
      });
  
      socket.on("sendMessage", (msg) => {
          console.log(msg);
          const mUser = userConnections;
      });
  });
  

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
