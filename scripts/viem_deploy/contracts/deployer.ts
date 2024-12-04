import { Hex } from 'viem'
import * as DeployerJson from '../../../artifacts/contracts/tools/Deployer.sol/Deployer.json'

export const DEPLOYER_ADDRESS: Hex =
  '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3'

export const Deployer = {
  constractName: DeployerJson.contractName,
  address: DEPLOYER_ADDRESS,
  abi: DeployerJson.abi,
}