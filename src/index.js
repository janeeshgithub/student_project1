const express = require("express");
const path = require("path");
const collection = require("./config");
const bcrypt = require('bcrypt');

const app = express();

app.use(express.json());

app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set('views, "path.join("c:\Users\chith\Videos\web development\pdl_project - copy\views',"views"); 
app.get("/", (req, res) => {
    res.render("frontpage"); 
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        password: req.body.password
    }

  
    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; 

        const userdata = await collection.insertMany(data);
        console.log(userdata);
    }

});

app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("User name cannot found");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            res.send("wrong Password");
        } else {
            res.render("home");
        }
    } catch {
        res.send("wrong Details");
    }
});




const port = 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});