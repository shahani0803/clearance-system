import { useState } from "react";
import axios from "axios";


export default function LoginForm() {
    return (
        <div>
            <h2>Login</h2>
        </div>
    );
}

function Login() {
    const [userId, setUserId] = userState("");
    const [password, setPassword] = userState("");

    const handleLogin = async () => {
        const res = await axios.post("http://localhost:5001/api/login", {
            userId,
            password
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);

        if (res.data.role === "admin") {
            window.location.href = "/admin-dashboard";
        } else {
            window.location.href = "/student-dashbord";
        }
    };

    return (
        <>
            <input
                placeholder="User ID"
                onChange={e => setUserId(e.target.value)}
            />
            <input
                type="password"
                placeholder="password"
                onChange={e => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>
        </>
    );
}