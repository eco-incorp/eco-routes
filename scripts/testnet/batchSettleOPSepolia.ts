import {
  // AbiCoder,
  Block,
  Contract,
  encodeRlp,
  getAddress,
  getBytes,
  hexlify,
  // keccak256,
  // solidityPackedKeccak256,
  stripZerosLeft,
  // toBeArray,
  toQuantity,
  toNumber,
  // zeroPadValue,
  toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  // actors,
  // intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'
// import { intent } from '../../test/testData'

type SourceChainInfo = {
  sourceChain: number
  lastProvenBlock: BigInt
  needNewProvenState: boolean
}
// type SourceChains = SourceChainInfo[]

type Intent = {
  sourceChain: number
  intentHash: string
  claimant: string
  blockNumber: BigInt
}
// type Intents = Intent[]

export async function getBatchSettled() {
  // Get the latest resolved fault dispute game
  // Get the GameId information for the fault dispute game
  // return faultDisputeGame address, gameId, blockNumber
  // Recommend making approximateUnsettledGames configurable and could go as high as 84 but safest is zero.
  console.log('In getFaultDisputeGame')
  const disputeGameFactoryContract = s.sepoliaSettlementContractOptimism
  const approximateUnsettledGames = 320n // Initial Test on Sepolia gave 327
  let gameIndex =
    (await disputeGameFactoryContract.gameCount()) -
    1n -
    approximateUnsettledGames
  // lastGame = 1712n
  console.log('Starting lastGame: ', gameIndex.toString())
  while (gameIndex > 0) {
    const gameData = await disputeGameFactoryContract.gameAtIndex(gameIndex)
    const faultDisputeGameAddress = gameData.proxy_
    const faultDisputeGameContract = new Contract(
      faultDisputeGameAddress,
      FaultDisputeGameArtifact.abi,
      s.sepoliaProvider,
    )
    const faultDisputeGameResolvedEvents =
      await faultDisputeGameContract.queryFilter(
        faultDisputeGameContract.getEvent('Resolved'),
      )
    if (faultDisputeGameResolvedEvents.length !== 0) {
      const blockNumber = await faultDisputeGameContract.l2BlockNumber()
      return {
        blockNumber,
        gameIndex,
        faultDisputeGameAddress,
        faultDisputeGameContract,
      }
    }
    gameIndex -= 1n
  }
}
export async function getIntentsToProve(settlementBlockNumber: BigInt) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  const sourceChainConfig = networks.optimismSepolia.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let optimismSepoliaProvenState
  let startingBlockNumber = 0n
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  startingBlockNumber = networks.optimismSepolia.proverContractDeploymentBlock
  const inboxDeploymentBlock = networks.optimismSepolia.inbox.deploymentBlock
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      optimismSepoliaProvenState = await proverContract.provenStates(
        // await s.[sourceChain]ProverContract.provenStates(
        networkIds.optimismSepolia,
      )
      sourceChainInfo.sourceChain = networkIds.sourceChainInfo.lastProvenBlock =
        optimismSepoliaProvenState.blockNumber
      if (optimismSepoliaProvenState.blockNumber > inboxDeploymentBlock) {
        sourceChainInfo.lastProvenBlock = optimismSepoliaProvenState.blockNumber
        if (optimismSepoliaProvenState.blockNumber < startingBlockNumber) {
          startingBlockNumber = optimismSepoliaProvenState.blockNumber
        }
      } else {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      }
      sourceChainInfo.needNewProvenState = false
      sourceChains[networkIds[sourceChain]] = sourceChainInfo
    } catch (e) {
      sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
      sourceChainInfo.needNewProvenState = false
      sourceChains[networkIds[sourceChain]] = sourceChainInfo
      scanAllIntentsForInbox = true
      startingBlockNumber = inboxDeploymentBlock
      console.log('Error in getIntentsToProve: ', e.message)
    }
  }
  if (scanAllIntentsForInbox) {
    startingBlockNumber = inboxDeploymentBlock
  }
  console.log('sourceChains: ', sourceChains)
  console.log('startingBlockNumber: ', startingBlockNumber.toString())

  //   if (optimismSepoliaBlockNumber > settlementBlockNumber) {
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents =
    await s.optimismSepoliaInboxContractSolver.queryFilter(
      s.optimismSepoliaInboxContractSolver.getEvent('Fulfillment'),
      toQuantity(startingBlockNumber),
      toQuantity(settlementBlockNumber),
    )
  console.log('intentHashEvents.length: ', intentHashEvents.length)
  // Filter out intents that have already been proven
  // Note this can use the proventStates from the Prover Contract
  // but also need to cater for the case where the proven World state is updated but the intents not proven
  // also mark needProvenState as true for the chains which have new intents to prove
  const intentsToProve = intentHashEvents
    .map((intentHashEvent) => {
      const intentToProve: Intent = {} as Intent
      intentToProve.sourceChain = toNumber(intentHashEvent.topics[2])
      intentToProve.intentHash = intentHashEvent.topics[1]
      intentToProve.claimant = getAddress(
        stripZerosLeft(intentHashEvent.topics[3]),
      )
      intentToProve.blockNumber = BigInt(intentHashEvent.blockNumber)
      return intentToProve
    })
    .filter((intentToProve) => {
      if (
        intentToProve.blockNumber >
          sourceChains[intentToProve.sourceChain].lastProvenBlock &&
        intentToProve.blockNumber <= settlementBlockNumber
      ) {
        sourceChains[intentToProve.sourceChain].needNewProvenState = true
      }
      // False removes it true keeps it
      return (
        intentToProve.blockNumber >
        sourceChains[intentToProve.sourceChain].lastProvenBlock
      )
    })

  console.log('sourceChains: ', sourceChains)
  console.log('intentsToProve: ', intentsToProve)
  return { sourceChains, intentsToProve }
  // return [chainId, intentHash, intentFulfillTransaction]
}

// Include individual proving Mechanisms for each sourceChain
// TODO: Consolidate the multiple functions into a parameterized function
async function proveSepoliaSettlementLayerStateOnBaseSepolia() {
  console.log('In proveSettlementLayerState')
  const setlementBlock = await s.baseSepolial1Block.number()
  const settlmentBlockTag = toQuantity(setlementBlock)

  const block: Block = await s.sepoliaProvider.send('eth_getBlockByNumber', [
    settlmentBlockTag,
    false,
  ])
  // const block: Block = await s.layer2DestinationProvider.send(
  //   'eth_getBlockByNumber',
  //   [config.cannon.layer2.endBatchBlock, false],
  // )
  // console.log('block: ', block)

  let tx
  let settlementWorldStateRoot
  try {
    const rlpEncodedBlockData = encodeRlp([
      block.parentHash,
      block.sha3Uncles,
      block.miner,
      block.stateRoot,
      block.transactionsRoot,
      block.receiptsRoot,
      block.logsBloom,
      stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
      toBeHex(block.number),
      toBeHex(block.gasLimit),
      toBeHex(block.gasUsed),
      block.timestamp,
      block.extraData,
      block.mixHash,
      block.nonce,
      toBeHex(block.baseFeePerGas),
      block.withdrawalsRoot,
      stripZerosLeft(toBeHex(block.blobGasUsed)),
      stripZerosLeft(toBeHex(block.excessBlobGas)),
      block.parentBeaconBlockRoot,
    ])
    // console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    tx = await s.baseSepoliaProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
    )
    await tx.wait()
    console.log('Prove Settlement world state tx: ', tx.hash)
    settlementWorldStateRoot = block.stateRoot
    console.log(
      'Proven L1 world state block: ',
      setlementBlock,
      settlmentBlockTag,
    )
    console.log('Proven Settlement world state root:', settlementWorldStateRoot)
    return { settlmentBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveSettlementLayerState:`, e.shortMessage)
    } else {
      console.log(`Error in proveSettlementLayerState:`, e)
    }
  }
  //   have successfully proven L1 state
}

async function proveSepoliaSettlementLayerStateOnEcoTestNet() {
  console.log('In proveSepoliaSettlementLayerStateOnEcoTestNet')
  const setlementBlock = await s.baseSepolial1Block.number()
  const settlmentBlockTag = toQuantity(setlementBlock)

  const block: Block = await s.sepoliaProvider.send('eth_getBlockByNumber', [
    settlmentBlockTag,
    false,
  ])
  // const block: Block = await s.layer2DestinationProvider.send(
  //   'eth_getBlockByNumber',
  //   [config.cannon.layer2.endBatchBlock, false],
  // )
  // console.log('block: ', block)

  let tx
  let settlementWorldStateRoot
  try {
    const rlpEncodedBlockData = encodeRlp([
      block.parentHash,
      block.sha3Uncles,
      block.miner,
      block.stateRoot,
      block.transactionsRoot,
      block.receiptsRoot,
      block.logsBloom,
      stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
      toBeHex(block.number),
      toBeHex(block.gasLimit),
      toBeHex(block.gasUsed),
      block.timestamp,
      block.extraData,
      block.mixHash,
      block.nonce,
      toBeHex(block.baseFeePerGas),
      block.withdrawalsRoot,
      stripZerosLeft(toBeHex(block.blobGasUsed)),
      stripZerosLeft(toBeHex(block.excessBlobGas)),
      block.parentBeaconBlockRoot,
    ])
    // console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    tx = await s.ecoTestNetProverContract.proveSettlementLayerStatePriveleged(
      getBytes(hexlify(rlpEncodedBlockData)),
      networkIds.sepolia,
    )
    await tx.wait()
    console.log('Prove Settlement world state tx: ', tx.hash)
    settlementWorldStateRoot = block.stateRoot
    console.log(
      'Proven L1 world state block: ',
      setlementBlock,
      settlmentBlockTag,
    )
    console.log('Proven Settlement world state root:', settlementWorldStateRoot)
    return { settlmentBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveSettlementLayerState:`, e.shortMessage)
    } else {
      console.log(`Error in proveSettlementLayerState:`, e)
    }
  }
  //   have successfully proven L1 state
}

export async function proveOpSepoliaBatchSettled(
  blockNumber,
  gameIndex,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  sourceChains,
  intentsToProve,
) {
  console.log('In proveOpSepoliaBatchSettled')
  // for (const sourceChain of sourceChains) {
  // for (const sourceChain of Object.entries(sourceChains)) {
  await Object.entries(sourceChains).forEach(
    async ([sourceChainkey, sourceChain]) => {
      console.log('key: ', sourceChainkey)
      console.log('sourceChain: ', sourceChain)
      if (sourceChain.needNewProvenState) {
        //   // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
        switch (sourceChain.sourceChain) {
          case networkIds.baseSepolia: {
            console.log('In baseSepolia')
            await proveSepoliaSettlementLayerStateOnBaseSepolia()
            //       proveWorldStateOptimismSepoliaOnBaseSepolia()
            break
          }
          case networkIds.optimismSepolia: {
            console.log('In optimismSepolia')
            break
          }
          case networkIds.ecoTestNet: {
            console.log('In ecoTestNet')
            await proveSepoliaSettlementLayerStateOnEcoTestNet()
            //       proveWorldStateOptimismSepoliaOnEcoTestNet()
            break
          }
          default: {
            break
          }
        }
        // Update the OptimismSepolia WorldState
      }
    },
  )
  // Loop through the sourceChains to prove
  // Switch on for each sourceChain
  // prove OptimismSepolia worldState for each sourceChain
  // prove OptimismSepolia worldState for BaseSepolia
  //   proveSepoliaSettlementLayerStateOnBaseSepolia
  //   proveWorldStateOptimismSepoliaOnBaseSepolia()
  // prove OptimismSepolia worldState for EcoTestNet
  //  proveSepoliaSettlementLayerStateOnEcoTestNet() using proveSettlementLayerStatePriveleged
  //  proveWorldStateOptimismSepoliaOnEcoTestNet()
}
export async function proveIntents(sourceChains, intentsToProve) {
  // loop through chainIds and intents
  // On new chainId, update the chains Optimism WorldState (and Ethereum and Base if needed)
  // prove each intent
  console.log('In proveIntents')
}

export async function withdrawFunds(sourceChains, intentsToProve) {
  // loop through chainIds and intents
  // On new chainId, update the chains Optimism WorldState (and Ethereum and Base if needed)
  // prove each intent
  console.log('In withdrawFunds')
}

async function main() {
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  // let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    console.log('Batch Settle of OP Sepolia')
    // Get the latest Batch Settled for OP Sepolia
    const {
      blockNumber,
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
    } = await getBatchSettled()
    console.log('blockNumber: ', blockNumber)
    console.log('gameIndex: ', gameIndex.toString())
    console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)

    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } =
      await getIntentsToProve(blockNumber)
    // Prove the latest batch settled
    await proveOpSepoliaBatchSettled(
      blockNumber,
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
      sourceChains,
      intentsToProve,
    )
    // Prove all the intents
    await proveIntents(sourceChains, intentsToProve)
    await withdrawFunds(sourceChains, intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
