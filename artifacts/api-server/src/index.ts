import express from "express";
import routes from "./routes/index";

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.listen(PORT, "localhost", () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
