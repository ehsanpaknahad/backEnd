const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const Task = require("./task")

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  tokens: [
    {
      token: {
        type: String,
        required: true
      }
    },
  ],
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 7,
    validate(value) {
      if (value.toLowerCase().includes("password")) {
        throw new Error("contain error")
      }
    }
  },  
  unit: {
    type: String,
    required: true,     
  }, 
  role: {
    type: String,   
    default: null,
  },   
  geometryEditing: {
    type: [String],    
  },  
  attributeEditing: {
    type: [String],    
  } 
})

userSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "author"
})

userSchema.index({
  username: 1,
  email: 1
}, {unique: true})

userSchema.methods.toJSON = function () {
  const user = this
  const userObject = user.toObject()

  delete userObject.password
  delete userObject.tokens

  return userObject
}

userSchema.methods.generateAuthToken = async function () {
  const user = this
  const token = jwt.sign({
    _id: user._id.toString()
  }, "mysecret")

  user.tokens = user.tokens.concat({token: token})
  await user.save()
  return token
}

userSchema.statics.findByCredentials = async (username, password) => {
  const user = await User.findOne({username})

  if (! user) {
    throw new Error("there is a problem with email")
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (! isMatch) {
    throw new Error("wrong password!!!")
  }

  return user
}

// hash the plain text password before saving
userSchema.pre("save", async function (next) {
  const user = this

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8)
  }
  next()
})

// delete user tasks when user remove
userSchema.pre("remove", async function (next) {
  const user = this

  await Task.deleteMany({author: user._id})
  next()
})

const User = mongoose.model("User", userSchema)

module.exports = User
