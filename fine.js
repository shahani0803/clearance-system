const mongoose = require("mongoose");
const { default: StudentList } = require("./components/StudentList");

const FineSchema = new mongoose.Schema({
    StudentId:{
        type: String,
        required:true,
    },
    amount:{
        type: Number,
        required: true,
    },
    status:{
        type: String,
        enum:["paid","unpaid"],
        default:"unpaid"
    }
});

module.exports = mongoose.model("Fine", FineSchema);
