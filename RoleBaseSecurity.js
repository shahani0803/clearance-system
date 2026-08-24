const jwt = require("jsonwebtoken");

const auth = (role = [] ) => {
    return (req, res, next) => {
        const token = req.headers.authorization;
        if (!token) return res.sendStatus(401);

        const decoder = jwt.verify(token, "SECRET_KEY");

        if (!role.includes(decoder.role))
            return res.sendStatus(403);

        req.user = decoded;
        next();
    };
} ;