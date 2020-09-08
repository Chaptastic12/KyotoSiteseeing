//Require mongoose
const mongoose = require("mongoose");

//Create our commentSchema
let commentSchema = mongoose.Schema({
	//text for our comment
	text: String,
	//Create the created at timestamp
	createdAt: {type: Date, default: Date.now},
	//Associate the author id and username
	author: {
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User"
			},
			username: String
	}
});

module.exports =  mongoose.model("Comment", commentSchema);