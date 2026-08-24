const mongoose = require("mongoose");

const activity = new mongoose.Schema({
    message: String,
    amount: Number,
}, { timestamps: true});

module.exports = mongoose.model("Acrivity", activitySchema);