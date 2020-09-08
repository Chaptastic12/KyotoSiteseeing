const mongoose	 = require("mongoose");

let destinationSchema = new mongoose.Schema({
	//Define the name, image, description cost and more
	name: 		 String,
	image:		 String,
	description: String,
	cost:		 Number,
	createdAt: {type: Date, default: Date.now},
	prefecture: String,
	address: String,
	typeOf: String,
	season: String,
	//Associate the IDs for the comments with the destination
	comments: [	//this will be an array of IDs of 'Comment'
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	],
	//Associate the IDs for the author with the destination
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	//Associate the reviews and rating with destination
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Review"
		}
	],
	rating: {
		type: Number,
		default: 0
	},
	//Store the likes this destination has received
	likes: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	]
}); 

//Compile our schema into a model
module.exports = mongoose.model("Destination", destinationSchema);