const express = require("express");
const path = require("path");
const http = require("http");
const session = require("express-session");
const { User, Pdf} = require("./src/config");  // Import both User and Pdf models
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
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountkey.json");
const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID

  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://project-c5e5a.appspot.com"
  });


  const bucket = admin.storage().bucket();
app.use(cors());

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set('views, "path.join("./views',"views");
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



app.get("/material", async (req, res) => {
    try {
        const pdfs = await Pdf.find();
        res.render("material", { pdfs }); // Make sure to pass pdfs array to the template
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Signup route
app.post("/signup", upload.single("profileImage"), async (req, res) => {
    try {
        const existingUser = await User.findOne({ name: req.body.username });

        if (existingUser) {
            return res.send('User already exists. Please choose a different username.');
        }

        // Check if a file was uploaded
        if (req.file) {
            // Upload the image to Firebase Storage
            const fileUpload = bucket.file(`${req.body.username}/${req.file.filename}`);
            const blobStream = fileUpload.createWriteStream();

            blobStream.on("error", (error) => {
                console.error(error);
                res.status(500).send("Error uploading image to Firebase Storage");
            });

            const uploadImage = () => new Promise((resolve, reject) => {
                blobStream.on("finish", () => {
                    console.log("Image uploaded successfully to Firebase Storage");
                    resolve();
                });

                blobStream.end(req.file.buffer);
            });

            await uploadImage(); // Wait for the image to be uploaded

            // Save the user data to MongoDB with the correct image URL
            const data = {
                name: req.body.username,
                password: req.body.password,
                email: req.body.email,
                image: `gs://project-c5e5a.appspot.com/${req.body.username}/${req.file.filename}`
            };
            console.log("Image URL:", data.image);

            const userdata = await User.create(data);
            console.log(userdata);
            res.render("login"); // Redirect to login after signup
        } else {
            return res.send('Please upload an image.');
        }
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

        // Temporarily comparing plain text passwords for testing (DO NOT USE IN PRODUCTION)
        if (user.password !== password) {
            return res.send("Wrong Password");
        }

        // Fetch the image name from MongoDB based on the user's name
        const imageMetadata = await User.findOne({ name: username }, { image: 1 });
        const imageName = imageMetadata ? imageMetadata.image : "default-image.jpg"; // Provide a default image name if not found

        // Store user ID in the session
        req.session.userId = user._id;

        // Pass user data to home.ejs template, including image name, username, and email
        res.render("home", { user: { ...user.toObject(), imageName } });
    } catch (error) {
        console.error(error);
        res.send("Wrong Details");
    }
});




// Upload PDF route
app.get("/upload", (req, res) => res.render("upload"));
app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        // Move the declaration of newPdf above this line
        let newPdf;

        const pdfData = {
            originalname: req.file.originalname,
            uploaderName: res.locals.user ? res.locals.user.name : "Anonymous",
        };

        // Save the PDF data to the MongoDB collection (only metadata)
        newPdf = await Pdf.create(pdfData);

        // Update the path using the newly created _id
        newPdf.path = `gs://project-c5e5a.appspot.com/${newPdf._id.toString()}`;
        await newPdf.save();

        // Upload the PDF file to Firebase Storage
        const fileUpload = bucket.file(newPdf._id.toString()); // Use the MongoDB _id as the filename
        const blobStream = fileUpload.createWriteStream();

        blobStream.on("error", (error) => {
            console.error(error);
            res.status(500).send("Error uploading file to Firebase Storage");
        });

        blobStream.on("finish", () => {
            console.log("File uploaded successfully to Firebase Storage");
            res.send("PDF uploaded successfully to Firebase Storage");
        });

        blobStream.end(req.file.buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error handling file upload");
    }
});

app.get("/material/:id", async (req, res) => {
    try {
        const pdfId = req.params.id;
        const pdf = await Pdf.findById(pdfId);

        if (!pdf) {
            return res.status(404).send("PDF not found");
        }

        // Get a read stream from Firebase Storage
        const remoteFileStream = bucket.file(pdf._id.toString()).createReadStream();

        // Set the appropriate content type for PDF
        res.type("application/pdf");

        // Pipe the read stream to the response
        remoteFileStream.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
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
