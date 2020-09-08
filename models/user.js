//Require the database as well as passport-local-mongoose for user login / password
const mongoose 				= require("mongoose"),
	  passportLocalMongoose = require("passport-local-mongoose");

//Create what our user will look like
let UserSchema = new mongoose.Schema({
	username: { type: String, unique: true, required: true},
	password: String,
	avatar: String,
	firstName: String,
	lastName: String,
	email: { type: String, unique: true, required: true},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false},
	likes: [	//this will be an array of IDs of 'liked' destinations so we can populate their like list
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Destination"
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);