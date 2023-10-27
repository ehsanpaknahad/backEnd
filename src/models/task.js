const mongoose = require("mongoose")

const Task = mongoose.model("Task", {
  title: {
    type: String,
    trim: true,
    required: true,
  },
  body: {
    type: String,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
})

module.exports = Task
