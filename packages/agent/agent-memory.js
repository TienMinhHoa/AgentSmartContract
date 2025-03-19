import { promises as fs } from 'fs';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Hàm đọc file JSON
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Lỗi khi đọc file JSON:', error);
        return null;
    }
}


async function appendToJsonFile(filePath, newData) {
    let oldData = [];
    let character = "";
    try {
        await fs.access(filePath);
        let data = JSON.parse(await fs.readFile(filePath, "utf8"))
        oldData = data["History"];
        character = data["Personality"];
        if (!Array.isArray(oldData)) throw new Error("JSON is in wrong Format");
    } catch (error) {
        console.error(error);
    }

    // Thêm dữ liệu mới vào mảng
    oldData.push(newData);

    // Ghi lại vào file
    try {
        await fs.writeFile(filePath, JSON.stringify({Personality:character,History:oldData}, null, 2));
    } catch (error) {
        console.error("Error when trying to save chat memory", error.message);
    }
}

export async function changeCharacter(chat_id="",character=""){
    let filePath = `./packages/agent/chat-history/${chat_id}.json`;
    try {
        await fs.access(filePath);
        let data = JSON.parse(await fs.readFile(filePath, "utf8"))
        data["Personality"] = character;
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error);
    }
}

export async function getCharacter(chat_id=""){
    let filePath = `./packages/agent/chat-history/${chat_id}.json`;
    try {
        await fs.access(filePath);
        let data = JSON.parse(await fs.readFile(filePath, "utf8"))
        
        return data["Personality"]
    } catch (error) {
        console.error(error);
        return
    }
}
export async function getHistoryChat(chat_id=""){
    const chat = [];
    const pathChat = `./packages/agent/chat-history/${chat_id}.json`;
    try{
        await fs.access(pathChat);
    } catch(error){
        return []
    }
    const data = await readJsonFile(pathChat);
    data["History"].forEach(element => {
        for(let key in element){
            if (key === "user"){
            chat.push(new HumanMessage({content:element[key]}));
            } else{
                chat.push(new AIMessage({content:element[key]}));
            }
        }
    });
    return chat;
}
export async function addHitoryChat(chat_id="",data){
    const pathChat = `./packages/agent/chat-history/${chat_id}.json`;
    try{
        await appendToJsonFile(pathChat,data)
    }
    catch(error){
        console.error("Error when trying to save chat memory:", error.message);
    }
}

// await appendToJsonFile("./packages/agent/chat-history/test.json",{user:"quit","system":"Bye"})

// const a = await getHistoryChat("test")
// console.log(a)