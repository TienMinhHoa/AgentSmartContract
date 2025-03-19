import express from "express";
import {invokeAgent} from "./agent/agent_smart_contract.js"

const app = express();
const port = 5000;
app.use(express.json());

app.post("/chat", async (req, res)=>{
    const content = req.body
    const response  = await invokeAgent("test",content.request)
    console.log(a);
    res.status(201).json({ user: content.request, system: response });
    // return a
})

app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});
