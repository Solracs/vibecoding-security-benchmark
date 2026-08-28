const express = require("express")
const router = express.Router()

const { setModel } = require("../framework/modelManager")

router.post("/admin/switch-model", (req, res) => {

    const { model } = req.body

    // setModel only activates a model that exists under src/implementations/;
    // ignore unknown values so the loader can't be pointed at a missing folder.
    setModel(model)

    res.redirect("/dashboard")
})

module.exports = router