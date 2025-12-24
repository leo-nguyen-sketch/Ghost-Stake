// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

contract ConfidentialMETH is ERC7984, ZamaEthereumConfig {
    event Claimed(address indexed account, uint64 amount, euint64 encryptedAmount);

    constructor() ERC7984("mETH", "mETH", "") {}

    function claim(uint64 amount) external returns (euint64 minted) {
        require(amount > 0, "Amount must be greater than zero");
        euint64 encryptedAmount = FHE.asEuint64(amount);
        minted = _mint(msg.sender, encryptedAmount);
        emit Claimed(msg.sender, amount, minted);
    }
}
