const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: ["student", "admin"],
        required:true
    },
    name:String,
    clearanceStatus: {
        type: String,
        default:"pending"
    }
});

module.exports = mongoose.model("User", UserSchema);