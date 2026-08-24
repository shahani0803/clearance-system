const bcrypt = require("bcryptjs");
const User = require("./models/User");

app.post("api/register", async(req, res) => {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        userId,
        password: hashedPassword,
        role,
        name
    });
    await user.save();
    res.json({
        message: "User created" });
});