var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    flash = require("connect-flash"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    methodOverride = require("method-override"),
    Campground = require("./models/campground"),
    Comment = require("./models/comment"),
    User = require("./models/user"),
    seedDB = require("./seeds")

//Requiring routes
var commentRoutes = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes = require("./routes/index")

mongoose.connect('mongodb://localhost:27017/yelp_camp', { useUnifiedTopology: true, useNewUrlParser: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
//seedDB();

// PASSPORT CONFIGUATION
app.use(require("express-session")({
    secret: "Pooh is the cutest",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(3000, function() {
    console.log("The YelpCamp Server has started!");
});


// var campgrounds = [
//     { name: "Salmon Creek", image: "https://pixabay.com/get/57e8d1454b56ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Granite Hill", image: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=600&q=60" },
//     { name: "Mountain Goat's Rest", image: "https://pixabay.com/get/57e1d14a4e52ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Salmon Creek", image: "https://pixabay.com/get/57e8d1454b56ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Granite Hill", image: "https://pixabay.com/get/54e5dc474355a914f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Mountain Goat's Rest", image: "https://pixabay.com/get/57e1d14a4e52ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Salmon Creek", image: "https://pixabay.com/get/57e8d1454b56ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Granite Hill", image: "https://pixabay.com/get/54e5dc474355a914f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" },
//     { name: "Mountain Goat's Rest", image: "https://pixabay.com/get/57e1d14a4e52ae14f1dc84609620367d1c3ed9e04e507440742e78d3974dc3_340.jpg" }

// ]