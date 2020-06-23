var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware")
    //INDEX - show all campgrounds
router.get("/", function(req, res) {
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({ name: regex }, function(err, allcampgrounds) {
            if (err) {
                console.log(err);
            } else {
                if (allcampgrounds.length < 1) {
                    req.flash("error", "Campground not found");
                    return res.redirect("back");

                }
                res.render("campgrounds/index", { campgrounds: allcampgrounds });
            }
        });
    } else {
        //get all campgrounds from DB
        Campground.find({}, function(err, allcampgrounds) {
            if (err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", { campgrounds: allcampgrounds, page: 'campgrounds' });
            }
        });
    }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res) {
    var name = req.body.name;
    var price = req.body.price;
    var image = req.body.image;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }

    var newCampground = { name: name, price: price, image: image, description: desc, author: author }
        //create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/campgrounds");
        }
    });
});

// NEW - shoe form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new");
});

//SHOW - Shows more info about one campground
router.get("/:id", function(req, res) {
    //find the cg with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground) {
        if (err || !foundCampground) {
            req.flash("error", "Campground not found");
            res.redirect("back");
        } else {
            console.log(foundCampground);
            // redner show template w/ that cg
            res.render("campgrounds/show", { campground: foundCampground });
        }
    });
});

// EDIT CAMPGROUNS ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    // is user logged it?
    Campground.findById(req.params.id, function(err, foundCampground) {
        res.render("campgrounds/edit", { campground: foundCampground });

        // does user own the campground?
        // otherwise, redirect
        // if not, redirect

    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    // find and update the correct campgrund
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground) {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
    //redirect to show page
});

// // DESTROY CAMPGROUND ROUTe
// router.delete("/:id", function(req, res) {
//     Campground.findByIdAndRemove(req.params.id, function(err) {
//         if (err) {
//             res.redirect("/campgrounds");
//         } else {
//             res.redirect("/campgrounds");
//         }
//     });
// });

// Delete/destroy Campground
router.delete("/:id", middleware.checkCampgroundOwnership, async(req, res) => {
    try {
        let foundCampground = await Campground.findById(req.params.id);
        await foundCampground.remove();
        res.redirect("/campgrounds");
    } catch (error) {
        console.log(error.message);
        res.redirect("/campgrounds");
    }
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;