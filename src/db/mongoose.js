const mongoose = require("mongoose")

mongoose.connect("mongodb://127.0.0.1:27017/task-manager-api", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
}, (error,client) => {
   if(error){
     return console.log('unaable to connect,the error is from mongoose')
   }

   console.log('connect from mongoose')
})
