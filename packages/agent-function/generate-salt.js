import { predictToken } from './predict-token.js';
import { ethers } from 'ethers';
import crypto from 'node:crypto';
import { logger } from '../logger/index.js';

export async function generateSalt(
    deployer,
    fid,
    name,
    symbol,
    image,
    cashHash,
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
            fid,
            name,
            symbol,
            image,
            cashHash,
            supply,
            salt
        );

        const tokenNum = BigInt(token);
        const pairedTokenNum = BigInt(pairedTokenAddress);

        if (tokenNum < pairedTokenNum) {
            logger.info(`---------------------------------`);
            logger.info(`Salt: ${salt}`);
            logger.info(`Token: ${token}`);
            logger.info(`---------------------------------`);
            return { salt, token };
        }

        i += BigInt(
            Math.floor((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) % 1000) + 1
        );
    }
}

// generateSalt(
//     "0x7372d36388E5e7d2cf7B3B9b4dB106D442F9a1a7",
//     0,
//     "Test Token",
//     "Test Symbol",
//     "haha",
//     "clanker",
//     1000000000000000000n,
//     "0x4200000000000000000000000000000000000006"
// )