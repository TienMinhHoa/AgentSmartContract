import { ethers } from "ethers";
import dotenv from "dotenv";
import SIMPLE_DEPLOYER_ABI from "./abis/SimpleDeployerABI.json" assert { type: "json" };

dotenv.config();

const SIMPLE_DEPLOYER_ADDRESS = process.env.SIMPLE_DEPLOYER_ADDRESS;


const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const simpleDeployer = new ethers.Contract(SIMPLE_DEPLOYER_ADDRESS, SIMPLE_DEPLOYER_ABI, signer);

export async function deployTokenAndPool(name, symbol, supply) {
    try {
        const initialSupply = ethers.parseUnits(supply.toString(), 18)
        const owner = signer.address;
        const fee = 3000;
        const tick = 60;

        console.log("Deploying token and pool...");
        
        const tx = await simpleDeployer.deployTokenAndPool(name, symbol, initialSupply, owner, fee, tick);
        console.log(`Transaction hash: ${tx.hash}`);

        // Chờ giao dịch được xác nhận
        const receipt = await tx.wait();
        console.log(`✅ Token and Pool Deployed! TX Hash: ${receipt.hash}`);

        // Lấy thông tin từ event
        const event = receipt.logs.find(log => log.address === SIMPLE_DEPLOYER_ADDRESS);
        if (event) {
            const parsedEvent = simpleDeployer.interface.parseLog(event);
            console.log(`🎉 Token Address: ${parsedEvent.args.token}`);
            console.log(`🎉 Pool Address: ${parsedEvent.args.pool}`);
        }
        return "Successfull"

    } catch (error) {
        console.error("❌ Error deploying token and pool:", error);
        return error
    }
}

// deployTokenAndPool("Test Token", "Test Symbol", "1000000");
