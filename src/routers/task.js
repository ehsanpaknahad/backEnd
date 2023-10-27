const express = require("express")
const router = new express.Router()
const Task = require("../models/task")
const auth = require("../middleware/auth")

router.post("/create-post", auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    author: req.user._id,
  })

  try {
    await task.save()
    res.status(201).send(task)
  } catch (e) {
    res.status(400).send(e)
  }
})

router.get("/tasks", auth, async (req, res) => {
  try {
    // const tasks = await Task.find({ author: req.user._id })
    // res.status(201).send(tasks)
    await req.user.populate("tasks").execPopulate()
    res.send(req.user.tasks)
  } catch (e) {
    res.status(500).send()
  }
})

router.get("/tasks/:id", auth, async (req, res) => {
  const _id = req.params.id

  try {
    const task = await Task.findOne({ _id, author: req.user._id })

    if (!task) {
      return res.status(404).send()
    }
    res.send(task)
  } catch (e) {
    res.status(500).send(e)
  }
})

router.delete("/tasks/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, author: req.user._id })
    if (!task) {
      return res.status(404).send()
    }
    res.send(task)
  } catch (e) {
    return res.status(500).send(e)
  }
})

router.patch("/tasks/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body)
  const allowUpdates = ["title", "body"]
  const isValidOperation = updates.every((update) => allowUpdates.includes(update))

  if (!isValidOperation) {
    return res.status(400).send({ error: "invalid update" })
  }

  try {
    const task = await Task.findOne({ _id: req.params.id, author: req.user._id })

    if (!task) {
      return res.status(404).send()
    }

    updates.forEach((update) => {
      task[update] = req.body[update]
    })

    await task.save()

    res.send(task)
  } catch (e) {
    res.status(400).send(e)
  }
})

module.exports = router
