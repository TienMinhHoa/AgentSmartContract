import { encodeAbiParameters, encodePacked, keccak256 } from 'viem';
import clankerTokenArtifact  from './abis/ClankerToken.json' assert { type: "json" };
import { config } from './config.js';

export async function predictToken(
    deployer,
    name,
    symbol,
    supply,
    salt
) {
    const create2Salt = keccak256(
        encodeAbiParameters(
            [{ type: 'address' }, { type: 'bytes32' }],
            [deployer, salt]
        )
    );

    const constructorArgs = encodeAbiParameters(
        [
            { type: 'string' },
            { type: 'string' },
            { type: 'uint256' },
            { type: 'address' },
        ],
        [name, symbol, supply, deployer]
    );

    const creationCode = clankerTokenArtifact.bytecode.object;
    const encodedCreationCode = encodePacked(
        ['bytes', 'bytes'],
        [creationCode, constructorArgs]
    );
    const creationCodeHash = keccak256(encodedCreationCode);

    const hash = keccak256(
        encodePacked(
            ['uint8', 'address', 'bytes32', 'bytes32'],
            [0xff, config.CLANKER_FACTORY_V2, create2Salt, creationCodeHash]
        )
    );
    console.log('🚀 ~ hash:', hash);

    return `0x${hash.slice(-40)}`;
}
