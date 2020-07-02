var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function(req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function(req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter })

var cloudinary = require('cloudinary');
const campground = require("../models/campground");
cloudinary.config({
    cloud_name: 'acharyan',
    api_key: 215182918995448,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

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

// CREATE - add new campground to DB
// router.post("/", middleware.isLoggedIn, function(req, res) {
//     // get data from form and add to campgrounds array
//     var name = req.body.name;
//     var image = req.body.image;
//     var desc = req.body.description;
//     var author = {
//         id: req.user._id,
//         username: req.user.username
//     }
//     geocoder.geocode(req.body.location, function(err, data) {
//         if (err || !data.length) {
//             req.flash('error', 'Invalid address');
//             console.log(err.message);
//             return res.redirect('back');
//         }
//         var lat = data[0].latitude;
//         var lng = data[0].longitude;
//         var location = data[0].formattedAddress;
//         var newCampground = { name: name, image: image, description: desc, author: author, location: location, lat: lat, lng: lng };
//         // Create a new campground and save to DB
//         Campground.create(newCampground, function(err, newlyCreated) {
//             if (err) {
//                 console.log(err.message);
//             } else {
//                 //redirect back to campgrounds page
//                 console.log(newlyCreated);
//                 res.redirect("/campgrounds");
//             }
//         });
//     });
// });


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        geocoder.geocode(req.body.location, function(err, data) {
            if (err || !data.length) {
                req.flash('error', 'Invalid address');
                return res.redirect('back');
            }
            req.body.campground.lat = data[0].latitude;
            req.body.campground.lng = data[0].longitude;
            req.body.campground.location = data[0].formattedAddress;

            // add cloudinary url for the image to the campground object under image property
            req.body.campground.image = result.secure_url;
            // add image's public_id to campground object
            req.body.campground.imageId = result.public_id;
            // add author to campground
            req.body.campground.author = {
                id: req.user._id,
                username: req.user.username
            }
            Campground.create(req.body.campground, function(err, campground) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
                res.redirect('/campgrounds/' + campground.id);
            });
        });
    });
});
// //CREATE - add new campground to DB
// router.post("/", middleware.isLoggedIn, function(req, res) {
//     var name = req.body.name;
//     var price = req.body.price;
//     var image = req.body.image;
//     var desc = req.body.description;
//     var author = {
//         id: req.user._id,
//         username: req.user.username
//     }

//     var newCampground = { name: name, price: price, image: image, description: desc, author: author }
//         //create a new campground and save to DB
//     Campground.create(newCampground, function(err, newlyCreated) {
//         if (err) {
//             console.log(err);
//         } else {
//             res.redirect("/campgrounds");
//         }
//     });
// });

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

// UPDATE CAMPGROUND WITH GEOCODER AND IMAGE UPLOAD
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res) {
    Campground.findById(req.params.id, async function(err, campground) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(campground.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    campground.image = result.secure_url;
                    campground.imageId = result.public_id;
                } catch (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            if (req.body.location !== campground.location) {
                try {
                    var updatedLocation = await geocoder.geocode(req.body.location);
                    campground.lat = updatedLocation[0].latitude;
                    campground.lng = updatedLocation[0].longitude;
                    campground.location = updatedLocation[0].formattedAddress;
                } catch (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            campground.name = req.body.campground.name;
            campground.price = req.body.campground.price;
            campground.description = req.body.campground.description;
            campground.save();
            req.flash("success", "Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
});


// UPDATE CAMPGROUND ROUTE with geocoder
// router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res) {
//     geocoder.geocode(req.body.location, function(err, data) {
//         if (err || !data.length) {
//             req.flash('error', 'Invalid address');
//             return res.redirect('back');
//         }
//         req.body.campground.lat = data[0].latitude;
//         req.body.campground.lng = data[0].longitude;
//         req.body.campground.location = data[0].formattedAddress;

//         Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground) {
//             if (err) {
//                 req.flash("error", err.message);
//                 res.redirect("back");
//             } else {
//                 req.flash("success", "Successfully Updated!");
//                 res.redirect("/campgrounds/" + campground._id);
//             }
//         });
//     });
// });


// UPDATE CAMPGROUND ROUTE
// router.put("/:id", middleware.checkCampgroundOwnership, function(req, res) {
//     // find and update the correct campgrund
//     Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground) {
//         if (err) {
//             res.redirect("/campgrounds");
//         } else {
//             res.redirect("/campgrounds/" + req.params.id);
//         }
//     });
//     //redirect to show page
// });

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

// router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {

//     Campground.findById(req.params.id, async function(err, campground) {
//         if (err) {
//             req.flash("error", err.message);
//             return res.redirect("back");
//         }
//         try {
//             await cloudinary.v2.uploader.destroy(campground.imageId);
//             campground.remove();
//             req.flash('success', 'Campground deleted successfully!');
//             res.redirect('/campgrounds');
//         } catch (err) {
//             if (err) {
//                 req.flash("error", err.message);
//                 return res.redirect("back");
//             }
//         }
//     });
// });
//Delete/destroy Campground
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