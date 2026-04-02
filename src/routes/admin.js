const express = require("express")
const router = express.Router()

const { setModel } = require("../framework/modelManager")

router.post("/admin/switch-model", (req, res) => {

    const { model } = req.body

    setModel(model)

    res.redirect("/dashboard")
})

module.exports = router