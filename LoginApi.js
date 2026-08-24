const jwt = required("jsonwebtoken");

app.post ("/api/login", async (req, res) => {
    const { UserId, password } = req.body;

    const user = await User.findOne({ userId });
    if (!user) return res.status(401).json({ msg: "Invalid ID"});

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(401).json({ msg: " Wrong Password"});

    const token = jwt.sign(
        { id: user._id, role: user.role, userId: user.userId},
        "SECRET_KEY",
        {expiresIn: "1d"}
    );

    res.json({
        token,
        role: user.role,
        name: user.name
    });

});