import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedMETH = await deploy("ConfidentialMETH", {
    from: deployer,
    log: true,
  });

  const deployedMZama = await deploy("ConfidentialMZama", {
    from: deployer,
    log: true,
  });

  const deployedStaking = await deploy("ConfidentialStaking", {
    from: deployer,
    log: true,
    args: [deployedMETH.address, deployedMZama.address],
  });

  console.log(`ConfidentialMETH contract: `, deployedMETH.address);
  console.log(`ConfidentialMZama contract: `, deployedMZama.address);
  console.log(`ConfidentialStaking contract: `, deployedStaking.address);
};
export default func;
func.id = "deploy_confidential_stake"; // id required to prevent reexecution
func.tags = ["ConfidentialTokens", "ConfidentialStaking"];
