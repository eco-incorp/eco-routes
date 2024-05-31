import hre from 'hardhat'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import { AlchemyProvider, Wallet, Signer } from 'ethers'
import { toBytes } from 'viem'

const PRIVATE_KEY = process.env.DEPLOY_PRIVATE_KEY || ''
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const L1_NETWORK = 'sepolia'
const L1Provider = new AlchemyProvider(L1_NETWORK, ALCHEMY_API_KEY)
const L1signer: Signer = new Wallet(PRIVATE_KEY, L1Provider)
const L2_NETWORK = 'base-sepolia'
const L2Provider = new AlchemyProvider(L2_NETWORK, ALCHEMY_API_KEY)
const L2signer: Signer = new Wallet(PRIVATE_KEY, L2Provider)

const baseOutputContractAddress = '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254' // sepolia address

const txToProve =
  '0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee'
const inboxContract = '0xCfC89c06B5499ee50dfAf451078D85Ad71D76079'
const intentHash =
  '0x4321000000000000000000000000000000000000000000000000000000000000'
const storageSlot = hre.ethers.solidityPackedKeccak256(
  ['bytes'],
  [
    hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [intentHash, 0],
    ),
  ],
)

async function main() {
  // hre.changeNetwork(L2_NETWORK)
  const txDetails = await L2Provider.getTransaction(txToProve)
  const txBlock = txDetails.blockNumber

  const baseOutputContract = await hre.ethers.ContractFactory.fromSolidity(
    L2OutputArtifact,
    L1signer,
  ).attach(baseOutputContractAddress)
  const outputIndex = await baseOutputContract.getL2OutputIndexAfter(txBlock)
  const outputData = await baseOutputContract.getL2OutputAfter(txBlock)
  const l2EndBatchBlock = hre.ethers.hexlify(toBytes(outputData.l2BlockNumber))
  // eslint-disable-next-line no-unused-vars
  const outputRoot = outputData.outputRoot

  // await hre.changeNetwork(L2_NETWORK)
  const l2OutputStorageRoot = (
    await L2Provider.send('eth_getBlockByNumber', [l2EndBatchBlock, false])
  ).stateRoot
  const proof = await L2Provider.send('eth_getProof', [
    inboxContract,
    [storageSlot],
    l2EndBatchBlock,
  ])

  const balance =
    proof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? hre.ethers.zeroPadValue(toBytes(proof.balance), 1)
        : proof.balance
  const nonce =
    proof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.nonce.length & (1 === 1)
        ? hre.ethers.zeroPadValue(toBytes(proof.nonce), 1)
        : proof.nonce

  const proveIntentParams = [
    proof.storageProof[0].value,
    inboxContract,
    intentHash,
    Number(outputIndex) - 1, // see comment in contract
    proof.storageProof[0].proof,
    hre.ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
    proof.accountProof,
    l2OutputStorageRoot,
  ]
  console.log(proveIntentParams)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})