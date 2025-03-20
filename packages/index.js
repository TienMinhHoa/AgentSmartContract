import express from "express";
import {invokeAgent, setCharacter} from "./agent/agent_smart_contract.js"

const app = express();
const port = 8080;
app.use(express.json());

app.post("/chat", async (req, res)=>{
    const content = req.body;
    const response  = await invokeAgent(content.id_chat,content.request);
    // console.log(a);
    res.status(201).json({ user: content.request, system: response });
    // return a
})

app.post("/setCharacter", async (req,res)=>{
    const content = req.body;
    await setCharacter(content.personality)
    res.status(201).json({response:`set charater to ${content.personality}`})
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
