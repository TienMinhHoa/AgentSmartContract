import { predictToken } from './predict-token.js';
import { ethers } from 'ethers';
import crypto from 'node:crypto';
import { logger } from '../logger/index.js';

export async function generateSalt(
    deployer,
    name,
    symbol,
    supply,
    pairedTokenAddress
) {
    const startingPoint = BigInt(
        '0x' +
        Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    );
    let i = startingPoint;
    while (true) {
        const salt = `0x${i.toString(16).padStart(64, '0')}`;
        const token = await predictToken(
            deployer,
            name,
            symbol,
            supply,
            salt
        );

        const tokenNum = BigInt(token);
        const pairedTokenNum = BigInt(pairedTokenAddress);

        if (tokenNum < pairedTokenNum) {
            logger.info(`---------------------------------`);
            logger.info(`Salt: ${salt}`);
            logger.info(`Token: ${token}`);
            logger.info(`pairedTokenNum: ${pairedTokenNum}`);
            logger.info(`tokenNum: ${tokenNum}`);
            logger.info(`---------------------------------`);
            return { salt, token };
        }

        i += BigInt(
            Math.floor((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) % 1000) + 1
        );
    }
}

// generateSalt(
//     "0xaD1fE2e10fB14A95D823525e8ed172EE1c86C65D",
//     "PINGU",
//     "PINGU",
//     ethers.parseUnits("1000000000000", 18),
//     "0x4200000000000000000000000000000000000006"
// )