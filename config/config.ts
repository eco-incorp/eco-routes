/* eslint-disable no-magic-numbers */
export default {
  sepolia: {
    layer: 1,
    role: ['Settlement'],
    network: 'sepolia',
    chainId: 11155111,
    l2BaseOutputOracleAddress: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
  },
  optimismSepolia: {
    layer: 2,
    role: ['Source'],
    network: 'optimism-sepolia',
    chainId: 11155420,
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    proverContractAddress: '0x6798EbAf16b2E23EfcaD15Fe3493f25D6ed1C892',
    intentSourceAddress: '0xc61Ac926D7efE2251CdFeae384F75222FDAe7a3F',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  baseSepolia: {
    layer: 2,
    role: ['Destination'],
    network: 'base-sepolia',
    chainId: 84532,
    inboxAddress: '0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  mainnet: {
    layer: 1,
    role: ['Settlement'],
    network: 'mainnet',
    chainId: 1,
    l2BaseOutputOracleAddress: '0x56315b90c40730925ec5485cf004d835058518A0',
  },
  optimism: {
    layer: 2,
    role: ['Source'],
    network: 'optimism',
    chainId: 10,
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    proverContractAddress: '0xcFbbD67c9f43a8E6D3D9aF7Ab93d61397c7a08CE',
    intentSourceAddress: '0xB005A84E3F203D91138b67d4E134Eadc0f462968',
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  },
  base: {
    layer: 2,
    role: ['Destination'],
    network: 'base',
    chainId: 8453,
    inboxAddress: '0x4520be39A6E407B0313042Efb05323efB76B506a',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  noncePacking: 1,
  intentSourceCounter: 100,
  l2OutputOracleSlotNumber: 3,
  l2OutputVersionNumber: 0,
  actors: {
    deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
    intentCreator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
    claimant: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
    prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
    recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
  },
  intent: {
    creator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    destinationChainId: 84532,
    recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
    targetTokens: [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`],
    targetAmounts: [1238],
    rewardTokens: ['0x5fd84259d66Cd46123540766Be93DFE6D43130D7'],
    rewardAmounts: [1239],
    duration: 3600,
  },
  mainnetIntent: {
    creator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    destinationChainId: 84533,
    recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
    targetTokens: [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`],
    targetAmounts: [1238],
    rewardTokens: ['0x0b2c639c533813f4aa9d7837caf62653d097ff85'],
    rewardAmounts: [1239],
    duration: 7200,
    intentHash:
      '0xe775b6c8c9f65a5d0141b487e0a33c35c5967f1d763b9aa55f63485cda2aedcf',
    intentFulfillTransaction:
      '0xbb73c4757883a44bcd648d4f0432e324a5ba0766ec253acc9212fdb66192e2a6',
  },
}
