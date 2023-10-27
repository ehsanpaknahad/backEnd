const express = require("express")
const bodyParser = require('body-parser');

require("./db/mongoose")
 

const cors = require("cors")
const userRouter = require("./routers/user")
const taskRouter = require("./routers/task")

const app = express()
const port = process.env.PORT || 8081

app.use(cors({ origin: "http://localhost:3000" }))

app.use(express.json())
app.use(userRouter)
app.use(taskRouter)
 
 

app.listen(port, () => {
  console.log("server is up on " + port)
})

