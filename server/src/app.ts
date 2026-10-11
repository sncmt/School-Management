import express from 'express'
import cookieParser from 'cookie-parser'
import router from './app/routes';
import { globalErrorHandler, notFoundHandler } from './app/errorHandler/globalErrorHandler';
import verifyOrigin from "./app/middlewares/verifyOrigin";

const app = express();

app.set("trust proxy", 1); 

// No CORS: browsers only call /api/v1 on the page's own host and Next.js forwards it
// here, so no request is cross-origin. verifyOrigin below blocks cross-site writes.

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(verifyOrigin);

app.get("/", (req, res) => {
    res.send("Hello World")
});

// for Docker and uptime checks: the process is up and answering
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/v1", router);


app.use(notFoundHandler)
app.use(globalErrorHandler);

export default app;